#!/usr/bin/env npx tsx

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
const ROOT_DIR = path.resolve(import.meta.dirname, '..');
dotenv.config({ path: path.join(ROOT_DIR, '.env') });

import {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DescribeStacksCommand,
  waitUntilStackCreateComplete,
  waitUntilStackUpdateComplete,
} from '@aws-sdk/client-cloudformation';
import {
  S3Client,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import {
  CloudFrontClient,
  CreateInvalidationCommand,
} from '@aws-sdk/client-cloudfront';
import {
  STSClient,
  AssumeRoleCommand,
} from '@aws-sdk/client-sts';
import { execSync } from 'child_process';
import * as esbuild from 'esbuild';
import * as mimeTypes from 'mime-types';
import archiver from 'archiver';
import {
  checkBootstrapResources,
  printBootstrapInstructions,
  getBootstrapConfig,
} from './bootstrap-check.js';
import { ResolverCompiler } from './utils/resolver-compiler.js';
import { logger, setLogFile, closeLogFile } from './utils/logger.js';

// Parse command line arguments
const args = process.argv.slice(2);
function getStage(): string {
  const stageIdx = args.indexOf('--stage');
  if (stageIdx !== -1 && args[stageIdx + 1]) {
    return args[stageIdx + 1];
  }
  const stageArg = args.find((arg) => arg.startsWith('--stage='));
  if (stageArg) {
    return stageArg.replace('--stage=', '');
  }
  return 'dev';
}
const stage = getStage();
const frontendOnly = args.includes('--frontend-only');

// Configuration
const APP_NAME = 'wpq';
const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const bootstrapConfig = getBootstrapConfig();
const TEMPLATE_BUCKET = bootstrapConfig.templateBucketName;
const STACK_NAME = `${APP_NAME}-${stage}`;
const CFN_ROLE_ARN = bootstrapConfig.cfnRoleArn;

// Clients
const cfnClient = new CloudFormationClient({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const cfClient = new CloudFrontClient({ region: REGION });

// Paths
const DEPLOY_DIR = import.meta.dirname;
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

// Resolver build hash - set during compilation
let resolversBuildHash = 'initial';

interface StackOutputs {
  CloudFrontDistributionId?: string;
  CloudFrontDomainName?: string;
  WebsiteBucket?: string;
  UserPoolId?: string;
  UserPoolClientId?: string;
  IdentityPoolId?: string;
  ApiUrl?: string;
  DataTableName?: string;
  SeedRoleArn?: string;
  CognitoDomain?: string;
  GoogleOAuthEnabled?: string;
  OrchestratorClusterName?: string;
  OrchestratorRepositoryUri?: string;
}

// STS client for assuming roles
const stsClient = new STSClient({ region: REGION });


async function uploadFile(bucket: string, key: string, body: Buffer | string, contentType?: string): Promise<void> {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
  }));
}

async function uploadTemplates(): Promise<void> {
  console.log('\nUploading CloudFormation templates...');

  // Upload main template
  const mainTemplate = fs.readFileSync(path.join(DEPLOY_DIR, 'cfn-template.yaml'), 'utf-8');
  await uploadFile(TEMPLATE_BUCKET, 'cfn-template.yaml', mainTemplate, 'application/x-yaml');

  // Upload nested templates
  const resourcesDir = path.join(DEPLOY_DIR, 'resources');
  const dirs = fs.readdirSync(resourcesDir);

  for (const dir of dirs) {
    const dirPath = path.join(resourcesDir, dir);
    if (fs.statSync(dirPath).isDirectory()) {
      const files = fs.readdirSync(dirPath).filter((f) => f.endsWith('.yaml'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(dirPath, file), 'utf-8');
        await uploadFile(TEMPLATE_BUCKET, `resources/${dir}/${file}`, content, 'application/x-yaml');
        console.log(`  Uploaded: resources/${dir}/${file}`);
      }
    }
  }
}

async function compileLambda(name: string, entryPoint: string): Promise<Buffer> {
  console.log(`  Compiling Lambda: ${name}`);

  const outdir = path.join(DEPLOY_DIR, '.cache', 'lambda', name);
  fs.mkdirSync(outdir, { recursive: true });

  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.join(outdir, 'index.js'),
    external: ['@aws-sdk/*'], // Use Lambda's built-in AWS SDK
    minify: true,
    sourcemap: false,
  });

  // Create zip using archiver (Node.js based, no system zip needed)
  const zipPath = path.join(outdir, `${name}.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.file(path.join(outdir, 'index.js'), { name: 'index.js' });
    archive.finalize();
  });

  return fs.readFileSync(zipPath);
}

async function uploadLambdas(): Promise<void> {
  console.log('\nCompiling and uploading Lambda functions...');

  const lambdaDir = path.join(BACKEND_DIR, 'lambda');
  const lambdas = [
    { name: 'cognitoPreSignUp', file: 'cognitoPreSignUp.ts' },
    { name: 'cognitoPostConfirmation', file: 'cognitoPostConfirmation.ts' },
    { name: 'getAblyToken', file: 'getAblyToken.ts' },
    { name: 'ensureProfile', file: 'ensureProfile.ts' },
    { name: 'stripeWebhook', file: 'stripeWebhook.ts' },
    { name: 'paypalWebhook', file: 'paypalWebhook.ts' },
    { name: 'createCheckout', file: 'createCheckout.ts' },
    // Note: orchestrator is now deployed via Fargate, not Lambda
  ];

  for (const lambda of lambdas) {
    try {
      const entryPoint = path.join(lambdaDir, lambda.file);
      if (!fs.existsSync(entryPoint)) {
        console.log(`  Skipping ${lambda.name} (file not found)`);
        continue;
      }
      const zip = await compileLambda(lambda.name, entryPoint);
      await uploadFile(TEMPLATE_BUCKET, `functions/${stage}/${lambda.name}.zip`, zip, 'application/zip');
      console.log(`  Uploaded: functions/${stage}/${lambda.name}.zip`);
    } catch (error) {
      console.error(`  Error compiling ${lambda.name}:`, error);
    }
  }
}

async function compileAndUploadResolvers(): Promise<void> {
  console.log('\nCompiling and uploading AppSync resolvers...');

  const resolverDir = path.join(BACKEND_DIR, 'resolvers');

  // Find all resolver files (relative to resolverDir)
  const resolverFiles: string[] = [];
  const findResolvers = (dir: string, relativePath: string = ''): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      if (entry.isDirectory()) {
        findResolvers(fullPath, relPath);
      } else if (entry.name.endsWith('.ts') && !entry.name.includes('.test.')) {
        resolverFiles.push(relPath);
      }
    }
  };
  findResolvers(resolverDir);

  if (resolverFiles.length === 0) {
    console.log('  No resolver files found, skipping...');
    return;
  }

  console.log(`  Found ${resolverFiles.length} resolver files`);

  const compiler = new ResolverCompiler({
    logger,
    baseResolverDir: resolverDir,
    s3KeyPrefix: `resolvers`,
    stage,
    s3BucketName: TEMPLATE_BUCKET,
    region: REGION,
    resolverFiles,
    debugMode: false,
  });

  resolversBuildHash = await compiler.compileAndUploadResolvers();

  console.log(`  Resolvers compiled and uploaded with hash: ${resolversBuildHash}`);
}

async function stackExists(): Promise<boolean> {
  try {
    await cfnClient.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
    return true;
  } catch (error: any) {
    if (error.message?.includes('does not exist')) {
      return false;
    }
    throw error;
  }
}

async function getStackOutputs(): Promise<StackOutputs> {
  const response = await cfnClient.send(new DescribeStacksCommand({ StackName: STACK_NAME }));
  const outputs: StackOutputs = {};

  for (const output of response.Stacks?.[0]?.Outputs || []) {
    if (output.OutputKey && output.OutputValue) {
      (outputs as any)[output.OutputKey] = output.OutputValue;
    }
  }

  return outputs;
}

async function deployStack(): Promise<void> {
  console.log('\nDeploying CloudFormation stack...');

  const templateUrl = `https://${TEMPLATE_BUCKET}.s3.${REGION}.amazonaws.com/cfn-template.yaml`;
  const ablyApiKey = process.env.ABLY_API_KEY || '';
  const deployUserArn = process.env.DEPLOY_USER_ARN || '';
  const domainName = stage === 'prod' ? (process.env.DOMAIN_NAME || '') : '';
  const hostedZoneId = stage === 'prod' ? (process.env.HOSTED_ZONE_ID || '') : '';
  const certificateArn = stage === 'prod' ? (process.env.CERTIFICATE_ARN || '') : '';
  const authDomainCertificateArn = stage === 'prod' ? (process.env.AUTH_DOMAIN_CERTIFICATE_ARN || '') : '';
  const googleClientId = process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const parameters = [
    { ParameterKey: 'Stage', ParameterValue: stage },
    { ParameterKey: 'AppName', ParameterValue: APP_NAME },
    { ParameterKey: 'TemplateBucketName', ParameterValue: TEMPLATE_BUCKET },
    { ParameterKey: 'AblyApiKey', ParameterValue: ablyApiKey },
    { ParameterKey: 'DeployUserArn', ParameterValue: deployUserArn },
    { ParameterKey: 'DomainName', ParameterValue: domainName },
    { ParameterKey: 'HostedZoneId', ParameterValue: hostedZoneId },
    { ParameterKey: 'CertificateArn', ParameterValue: certificateArn },
    { ParameterKey: 'AuthDomainCertificateArn', ParameterValue: authDomainCertificateArn },
    { ParameterKey: 'GoogleClientId', ParameterValue: googleClientId },
    { ParameterKey: 'GoogleClientSecret', ParameterValue: googleClientSecret },
    { ParameterKey: 'ResolversBuildHash', ParameterValue: resolversBuildHash },
  ];

  const exists = await stackExists();

  try {
    if (exists) {
      console.log(`Updating stack: ${STACK_NAME}`);
      console.log(`Using CFN Role: ${CFN_ROLE_ARN}`);
      await cfnClient.send(new UpdateStackCommand({
        StackName: STACK_NAME,
        TemplateURL: templateUrl,
        Parameters: parameters,
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        RoleARN: CFN_ROLE_ARN,
      }));
      await waitUntilStackUpdateComplete(
        { client: cfnClient, maxWaitTime: 900 },
        { StackName: STACK_NAME }
      );
    } else {
      console.log(`Creating stack: ${STACK_NAME}`);
      console.log(`Using CFN Role: ${CFN_ROLE_ARN}`);
      await cfnClient.send(new CreateStackCommand({
        StackName: STACK_NAME,
        TemplateURL: templateUrl,
        Parameters: parameters,
        Capabilities: ['CAPABILITY_NAMED_IAM'],
        RoleARN: CFN_ROLE_ARN,
        DisableRollback: true, // Keep resources on failure for debugging
      }));
      await waitUntilStackCreateComplete(
        { client: cfnClient, maxWaitTime: 900 },
        { StackName: STACK_NAME }
      );
    }
    console.log('Stack deployment complete!');
  } catch (error: any) {
    if (error.message?.includes('No updates are to be performed')) {
      console.log('No infrastructure updates needed');
    } else {
      throw error;
    }
  }
}

async function buildFrontend(outputs: StackOutputs): Promise<void> {
  console.log('\nBuilding frontend...');

  // Create .env.local with stack outputs
  const envContent = `
NEXT_PUBLIC_AWS_REGION=${REGION}
NEXT_PUBLIC_USER_POOL_ID=${outputs.UserPoolId}
NEXT_PUBLIC_USER_POOL_CLIENT_ID=${outputs.UserPoolClientId}
NEXT_PUBLIC_IDENTITY_POOL_ID=${outputs.IdentityPoolId}
NEXT_PUBLIC_APPSYNC_URL=${outputs.ApiUrl}
NEXT_PUBLIC_CLOUDFRONT_URL=https://${outputs.CloudFrontDomainName}
NEXT_PUBLIC_COGNITO_DOMAIN=${outputs.CognitoDomain}
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=${outputs.GoogleOAuthEnabled || 'false'}
`.trim();

  fs.writeFileSync(path.join(FRONTEND_DIR, '.env.local'), envContent);
  console.log('  Created .env.local');

  // Build
  execSync('yarn build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
}

async function buildAndPushOrchestrator(outputs: StackOutputs): Promise<void> {
  if (!outputs.OrchestratorRepositoryUri) {
    console.log('\nSkipping orchestrator deployment (ECR repository not found)');
    return;
  }

  console.log('\nBuilding and pushing orchestrator Docker image...');

  const repoUri = outputs.OrchestratorRepositoryUri;
  const accountId = repoUri.split('.')[0];
  const ecrRegistry = `${accountId}.dkr.ecr.${REGION}.amazonaws.com`;

  // Login to ECR
  console.log('  Logging into ECR...');
  const loginCmd = `aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ecrRegistry}`;
  execSync(loginCmd, { cwd: ROOT_DIR, stdio: 'inherit' });

  // Build Docker image
  console.log('  Building Docker image...');
  execSync(`docker build -t ${repoUri}:latest -f backend/Dockerfile .`, {
    cwd: ROOT_DIR,
    stdio: 'inherit',
  });

  // Push to ECR
  console.log('  Pushing to ECR...');
  execSync(`docker push ${repoUri}:latest`, { cwd: ROOT_DIR, stdio: 'inherit' });

  // Scale up and force new deployment of ECS service
  console.log('  Updating ECS service...');
  const clusterName = outputs.OrchestratorClusterName!;
  const serviceName = `${APP_NAME}-orchestrator-${stage}`;

  // Scale to 1 task (in case this is the first deploy) and force new deployment
  execSync(
    `aws ecs update-service --cluster ${clusterName} --service ${serviceName} --desired-count 1 --force-new-deployment --region ${REGION}`,
    { cwd: ROOT_DIR, stdio: 'inherit' }
  );

  console.log('  Orchestrator deployed!');
}

async function deployFrontend(outputs: StackOutputs): Promise<void> {
  console.log('\nDeploying frontend to S3...');

  const outDir = path.join(FRONTEND_DIR, 'out');
  if (!fs.existsSync(outDir)) {
    throw new Error('Frontend build output not found. Run build first.');
  }

  // Assume the seed role for S3/CloudFront access
  if (!outputs.SeedRoleArn) {
    throw new Error('SeedRoleArn not found in stack outputs. Make sure DeployUserArn is set.');
  }

  console.log('  Assuming seed role for deployment...');
  const assumeRoleResponse = await stsClient.send(new AssumeRoleCommand({
    RoleArn: outputs.SeedRoleArn,
    RoleSessionName: 'deploy-frontend',
    ExternalId: `${APP_NAME}-seed-${stage}`,
    DurationSeconds: 3600,
  }));

  const credentials = assumeRoleResponse.Credentials!;

  // Create clients with assumed role credentials
  const seedS3Client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: credentials.AccessKeyId!,
      secretAccessKey: credentials.SecretAccessKey!,
      sessionToken: credentials.SessionToken!,
    },
  });

  const seedCfClient = new CloudFrontClient({
    region: REGION,
    credentials: {
      accessKeyId: credentials.AccessKeyId!,
      secretAccessKey: credentials.SecretAccessKey!,
      sessionToken: credentials.SessionToken!,
    },
  });

  const bucket = outputs.WebsiteBucket!;

  // Upload all files using assumed role
  const uploadDir = async (dir: string, prefix: string = ''): Promise<void> => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const key = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        await uploadDir(fullPath, key);
      } else {
        const content = fs.readFileSync(fullPath);
        const contentType = mimeTypes.lookup(entry.name) || 'application/octet-stream';
        await seedS3Client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: content,
          ContentType: contentType,
        }));
      }
    }
  };

  await uploadDir(outDir);
  console.log('  Frontend uploaded to S3');

  // Invalidate CloudFront
  console.log('  Invalidating CloudFront cache...');
  await seedCfClient.send(new CreateInvalidationCommand({
    DistributionId: outputs.CloudFrontDistributionId,
    InvalidationBatch: {
      Paths: {
        Quantity: 1,
        Items: ['/*'],
      },
      CallerReference: Date.now().toString(),
    },
  }));

  console.log(`\nFrontend deployed to: https://${outputs.CloudFrontDomainName}`);
}

function cleanupOldFiles(dir: string, pattern: RegExp, keepLatest: number = 0): void {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir)
    .filter((f) => pattern.test(f))
    .map((f) => ({
      name: f,
      path: path.join(dir, f),
      mtime: fs.statSync(path.join(dir, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime); // Sort newest first

  // Delete all but the newest 'keepLatest' files
  const toDelete = files.slice(keepLatest);
  for (const file of toDelete) {
    try {
      fs.unlinkSync(file.path);
      console.log(`  Deleted old file: ${file.name}`);
    } catch (e) {
      // Ignore deletion errors
    }
  }
}

async function main(): Promise<void> {
  // Set up logging to file
  const logDir = path.join(ROOT_DIR, '.cache', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  // Clean up old log files (keep none - delete all before creating new one)
  console.log('Cleaning up old log files...');
  cleanupOldFiles(logDir, /^deploy-quiz-.*\.log$/, 0);

  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const action = frontendOnly ? 'frontend' : 'full';
  const logFile = path.join(logDir, `deploy-quiz-${stage}-${action}-${timestamp}.log`);
  setLogFile(logFile);
  logger.info(`Logging to: ${logFile}`);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Live Pub Quiz Deployment - Stage: ${stage}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    // Check bootstrap resources first (unless frontend-only)
    if (!frontendOnly) {
      console.log('Checking bootstrap resources...');
      const bootstrap = await checkBootstrapResources();

      if (!bootstrap.ready) {
        printBootstrapInstructions(
          bootstrap.missingBucket,
          bootstrap.missingRole,
          bootstrap.config
        );
        process.exit(1);
      }
      console.log('Bootstrap resources OK\n');
    }

    if (frontendOnly) {
      const outputs = await getStackOutputs();
      await buildFrontend(outputs);
      await deployFrontend(outputs);
    } else {
      await uploadTemplates();
      await uploadLambdas();
      await compileAndUploadResolvers();
      await deployStack();

      const outputs = await getStackOutputs();
      console.log('\nStack Outputs:', JSON.stringify(outputs, null, 2));

      // Build and deploy orchestrator to Fargate
      await buildAndPushOrchestrator(outputs);

      await buildFrontend(outputs);
      await deployFrontend(outputs);
    }

    console.log('\n' + '='.repeat(60));
    console.log('Deployment complete!');
    console.log('='.repeat(60) + '\n');
  } catch (error) {
    console.error('\nDeployment failed:', error);
    closeLogFile();
    process.exit(1);
  } finally {
    closeLogFile();
  }
}

main();

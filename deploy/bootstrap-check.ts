/**
 * Bootstrap Resource Checker
 *
 * Checks that the required bootstrap resources exist before deployment can proceed.
 * These resources must be created manually (one-time setup) for security reasons.
 *
 * WHY WE DO IT THIS WAY:
 * =====================
 *
 * Security Principle: Least Privilege
 *
 * The deployment user (quiz-night-live-deploy) has MINIMAL permissions:
 *   - Create/update CloudFormation stacks (scoped to quiz-night-live-* stacks only)
 *   - Upload templates to ONE specific S3 bucket
 *   - Pass the CloudFormation service role
 *
 * This means:
 *   - The deploy user CANNOT create IAM roles directly
 *   - The deploy user CANNOT access any S3 bucket except the template bucket
 *   - The deploy user CANNOT create/modify AWS resources directly
 *
 * All actual resource creation is done BY CloudFormation using a SERVICE ROLE
 * that has broader permissions.
 *
 * BOOTSTRAP RESOURCES:
 * ===================
 *
 * 1. S3 Bucket: quiz-night-live-deploy-templates (in ap-southeast-2)
 *    - Stores CloudFormation templates
 *    - Only the deploy user and CloudFormation need access
 *
 * 2. IAM Role: quiz-night-live-cfn-role
 *    - CloudFormation assumes this role to create resources
 *    - Has permissions to create all required AWS resources
 *
 * 3. IAM User: quiz-night-live-deploy
 *    - The deployment user with minimal permissions
 *    - Inline policy from deploy/iam-policies/quiz-night-live-deploy-policy.json
 *
 * Note: ACM Certificates are now created automatically via CloudFormation
 * (see deploy/resources/Certificate/certificate.yaml)
 */

import {
  S3Client,
  GetBucketLocationCommand,
} from "@aws-sdk/client-s3";
import {
  IAMClient,
  GetRoleCommand,
  GetUserCommand,
} from "@aws-sdk/client-iam";
import {
  STSClient,
  GetCallerIdentityCommand,
} from "@aws-sdk/client-sts";
import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";

const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID || "430118819356";

// Helper to prompt for user input
function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Update .env file with new credentials
function updateEnvFile(accessKeyId: string, secretAccessKey: string): void {
  const envPath = path.resolve(import.meta.dirname, '..', '.env');
  let content = fs.readFileSync(envPath, 'utf-8');

  // Replace or add AWS_ACCESS_KEY_ID
  if (content.includes('AWS_ACCESS_KEY_ID=')) {
    content = content.replace(/AWS_ACCESS_KEY_ID=.*/g, `AWS_ACCESS_KEY_ID=${accessKeyId}`);
  } else {
    content = `AWS_ACCESS_KEY_ID=${accessKeyId}\n${content}`;
  }

  // Replace or add AWS_SECRET_ACCESS_KEY
  if (content.includes('AWS_SECRET_ACCESS_KEY=')) {
    content = content.replace(/AWS_SECRET_ACCESS_KEY=.*/g, `AWS_SECRET_ACCESS_KEY=${secretAccessKey}`);
  } else {
    content = `AWS_SECRET_ACCESS_KEY=${secretAccessKey}\n${content}`;
  }

  fs.writeFileSync(envPath, content);
}

// Check if current credentials are valid
export async function checkCredentials(): Promise<{ valid: boolean; identity?: string }> {
  const sts = new STSClient({ region: MAIN_REGION });
  try {
    const response = await sts.send(new GetCallerIdentityCommand({}));
    return { valid: true, identity: response.Arn };
  } catch {
    return { valid: false };
  }
}

// Prompt for new credentials and validate them
export async function promptForCredentials(): Promise<boolean> {
  console.log(`
${"=".repeat(60)}
  AWS CREDENTIALS INVALID OR MISSING
${"=".repeat(60)}

The AWS credentials in .env are invalid or expired.

You need access keys for the quiz-night-live-deploy IAM user.
If you haven't created this user yet, do that first:

  1. Go to IAM > Users > Create user
  2. User name: quiz-night-live-deploy
  3. Create user (no console access needed)
  4. Add inline policy from: deploy/iam-policies/quiz-night-live-deploy-policy.json
  5. Create access key (CLI use case)

`);

  const accessKeyId = await prompt("Enter AWS_ACCESS_KEY_ID: ");
  if (!accessKeyId) {
    console.log("\nNo access key provided. Exiting.");
    return false;
  }

  const secretAccessKey = await prompt("Enter AWS_SECRET_ACCESS_KEY: ");
  if (!secretAccessKey) {
    console.log("\nNo secret key provided. Exiting.");
    return false;
  }

  // Test the new credentials
  console.log("\nValidating credentials...");
  process.env.AWS_ACCESS_KEY_ID = accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;

  const { valid, identity } = await checkCredentials();
  if (!valid) {
    console.log("Invalid credentials. Please check and try again.");
    return false;
  }

  console.log(`Credentials valid! Identity: ${identity}`);

  // Save to .env
  updateEnvFile(accessKeyId, secretAccessKey);
  console.log("Credentials saved to .env\n");

  return true;
}

export interface BootstrapConfig {
  templateBucketName: string;
  cfnRoleName: string;
  cfnRoleArn: string;
  deployUserName: string;
  region: string;
}

const MAIN_REGION = "ap-southeast-2";
const TEMPLATE_BUCKET_NAME = "quiz-night-live-deploy-templates";
const DEPLOY_USER_NAME = "quiz-night-live-deploy";

export function getBootstrapConfig(): BootstrapConfig {
  // Use CFN_ROLE_ARN from .env if available
  const cfnRoleArn = process.env.CFN_ROLE_ARN || `arn:aws:iam::${ACCOUNT_ID}:role/quiz-night-live-cfn-role`;
  const cfnRoleName = cfnRoleArn.split('/').pop() || 'quiz-night-live-cfn-role';

  return {
    templateBucketName: TEMPLATE_BUCKET_NAME,
    cfnRoleName,
    cfnRoleArn,
    deployUserName: DEPLOY_USER_NAME,
    region: MAIN_REGION,
  };
}

export interface BootstrapCheckResult {
  ready: boolean;
  missingBucket: boolean;
  missingRole: boolean;
  missingUser: boolean;
  config: BootstrapConfig;
}

export async function checkBootstrapResources(): Promise<BootstrapCheckResult> {
  const config = getBootstrapConfig();

  const s3 = new S3Client({ region: MAIN_REGION });
  const iam = new IAMClient({ region: MAIN_REGION });

  let missingBucket = false;
  let missingRole = false;
  let missingUser = false;

  // Check template bucket
  try {
    await s3.send(new GetBucketLocationCommand({ Bucket: config.templateBucketName }));
  } catch (error: unknown) {
    missingBucket = true;
  }

  // Check CloudFormation role
  try {
    await iam.send(new GetRoleCommand({ RoleName: config.cfnRoleName }));
  } catch (error: unknown) {
    missingRole = true;
  }

  // Check deploy user
  try {
    await iam.send(new GetUserCommand({ UserName: config.deployUserName }));
  } catch (error: unknown) {
    missingUser = true;
  }

  // Note: Certificates are now created automatically via CloudFormation
  // (see deploy/resources/Certificate/certificate.yaml)

  const ready = !missingBucket && !missingRole && !missingUser;

  return {
    ready,
    missingBucket,
    missingRole,
    missingUser,
    config,
  };
}

export function printBootstrapInstructions(result: BootstrapCheckResult): void {
  const { missingBucket, missingRole, missingUser, config } = result;

  // Print only the FIRST missing resource, so user can fix one at a time
  if (missingBucket) {
    console.log(`
${"=".repeat(70)}
  BOOTSTRAP STEP 1/3: S3 Template Bucket
${"=".repeat(70)}

Create an S3 bucket named: ${config.templateBucketName}

${"─".repeat(70)}
CloudShell Command (copy & paste):
${"─".repeat(70)}

aws s3 mb s3://${config.templateBucketName} --region ap-southeast-2

${"=".repeat(70)}
  After creating the bucket, run the deploy again.
${"=".repeat(70)}
`);
    return;
  }

  if (missingRole) {
    console.log(`
${"=".repeat(70)}
  BOOTSTRAP STEP 2/3: CloudFormation Service Role
${"=".repeat(70)}

Create an IAM role named: ${config.cfnRoleName}

${"─".repeat(70)}
CloudShell Commands (copy & paste each line):
${"─".repeat(70)}

aws iam create-role --role-name ${config.cfnRoleName} --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"cloudformation.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

aws iam attach-role-policy --role-name ${config.cfnRoleName} --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

${"=".repeat(70)}
  After creating the role, run the deploy again.
${"=".repeat(70)}
`);
    return;
  }

  if (missingUser) {
    const policyJson = JSON.stringify({
      "Version": "2012-10-17",
      "Statement": [
        {"Sid": "CloudFormation", "Effect": "Allow", "Action": ["cloudformation:CreateStack", "cloudformation:UpdateStack", "cloudformation:DeleteStack", "cloudformation:DescribeStacks", "cloudformation:DescribeStackEvents", "cloudformation:DescribeStackResources", "cloudformation:GetTemplate"], "Resource": "arn:aws:cloudformation:*:430118819356:stack/quiz-night-live-*/*"},
        {"Sid": "CloudFormationList", "Effect": "Allow", "Action": "cloudformation:ListStacks", "Resource": "*"},
        {"Sid": "S3BucketObjects", "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"], "Resource": ["arn:aws:s3:::quiz-night-live-deploy-templates/*", "arn:aws:s3:::quiz-night-live-frontend-*/*"]},
        {"Sid": "S3BucketList", "Effect": "Allow", "Action": ["s3:ListBucket", "s3:GetBucketLocation"], "Resource": ["arn:aws:s3:::quiz-night-live-deploy-templates", "arn:aws:s3:::quiz-night-live-frontend-*"]},
        {"Sid": "CloudFrontInvalidation", "Effect": "Allow", "Action": ["cloudfront:CreateInvalidation", "cloudfront:GetInvalidation"], "Resource": "*"},
        {"Sid": "PassCFNRole", "Effect": "Allow", "Action": "iam:PassRole", "Resource": "arn:aws:iam::430118819356:role/quiz-night-live-cfn-role", "Condition": {"StringEquals": {"iam:PassedToService": "cloudformation.amazonaws.com"}}},
        {"Sid": "AssumeDeployRoles", "Effect": "Allow", "Action": "sts:AssumeRole", "Resource": "arn:aws:iam::430118819356:role/quiz-night-live-*-deploy-role-*"},
        {"Sid": "IAMReadRole", "Effect": "Allow", "Action": "iam:GetRole", "Resource": "arn:aws:iam::430118819356:role/quiz-night-live-cfn-role"},
        {"Sid": "IAMReadSelf", "Effect": "Allow", "Action": "iam:GetUser", "Resource": "arn:aws:iam::430118819356:user/quiz-night-live-deploy"}
      ]
    });

    console.log(`
${"=".repeat(70)}
  BOOTSTRAP STEP 3/3: Deploy IAM User
${"=".repeat(70)}

Create an IAM user named: ${config.deployUserName}

${"─".repeat(70)}
CloudShell Commands (copy & paste each line):
${"─".repeat(70)}

aws iam create-user --user-name ${config.deployUserName}

aws iam put-user-policy --user-name ${config.deployUserName} --policy-name ${config.deployUserName}-policy --policy-document '${policyJson}'

aws iam create-access-key --user-name ${config.deployUserName}

${"─".repeat(70)}
IMPORTANT: Save the AccessKeyId and SecretAccessKey from the output above!
Add them to your .env file:

  AWS_ACCESS_KEY_ID=<AccessKeyId>
  AWS_SECRET_ACCESS_KEY=<SecretAccessKey>
  DEPLOY_USER_ARN=arn:aws:iam::<account-id>:user/${config.deployUserName}
${"─".repeat(70)}

${"=".repeat(70)}
  After creating the user and saving credentials, run the deploy again.
${"=".repeat(70)}
`);
    return;
  }
}

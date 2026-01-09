#!/usr/bin/env npx tsx

/**
 * SES Email Receiving Deployment Script
 *
 * Deploys the SES email receiving infrastructure to us-east-1.
 * This stack receives verification emails from Cognito and stores codes in SSM for E2E tests.
 *
 * Usage:
 *   yarn workspace @quiz/deploy deploy:ses --stage=prod
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";

// Load .env from project root
const ROOT_DIR = path.resolve(import.meta.dirname, "..");
dotenv.config({ path: path.join(ROOT_DIR, ".env") });

import {
  CloudFormationClient,
  CreateStackCommand,
  UpdateStackCommand,
  DeleteStackCommand,
  DescribeStacksCommand,
  DescribeStackEventsCommand,
  waitUntilStackCreateComplete,
  waitUntilStackUpdateComplete,
  waitUntilStackDeleteComplete,
} from "@aws-sdk/client-cloudformation";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  LambdaClient,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
} from "@aws-sdk/client-lambda";
import {
  SESClient,
  SetActiveReceiptRuleSetCommand,
  VerifyDomainIdentityCommand,
  GetIdentityVerificationAttributesCommand,
} from "@aws-sdk/client-ses";
import * as esbuild from "esbuild";
import archiver from "archiver";
import {
  getBootstrapConfig,
  checkCredentials,
  promptForCredentials,
} from "./bootstrap-check.js";

// Parse command line arguments
const args = process.argv.slice(2);
function getStage(): string {
  const stageIdx = args.indexOf("--stage");
  if (stageIdx !== -1 && args[stageIdx + 1]) {
    return args[stageIdx + 1];
  }
  const stageArg = args.find((arg) => arg.startsWith("--stage="));
  if (stageArg) {
    return stageArg.replace("--stage=", "");
  }
  return "prod";
}
const stage = getStage();

// Configuration
const APP_NAME = "quiz-night-live";
const SES_REGION = "us-east-1"; // SES receiving only works in us-east-1, us-west-2, eu-west-1
const MAIN_REGION = process.env.AWS_REGION || "ap-southeast-2";
const bootstrapConfig = getBootstrapConfig();
const TEMPLATE_BUCKET = bootstrapConfig.templateBucketName;
const SES_STACK_NAME = `${APP_NAME}-ses-email-receiving-${stage}`;
const CFN_ROLE_ARN = bootstrapConfig.cfnRoleArn;
const DOMAIN_NAME = process.env.DOMAIN_NAME || "quiznight.live";
const HOSTED_ZONE_ID = process.env.HOSTED_ZONE_ID || "";

// Clients - SES region (us-east-1)
const cfnClientSes = new CloudFormationClient({ region: SES_REGION });
const s3ClientSes = new S3Client({ region: SES_REGION });
const lambdaClientSes = new LambdaClient({ region: SES_REGION });
const sesClient = new SESClient({ region: SES_REGION });

// Main region client for template bucket
const s3ClientMain = new S3Client({ region: MAIN_REGION });

// Paths
const DEPLOY_DIR = import.meta.dirname;
const BACKEND_DIR = path.join(ROOT_DIR, "backend");

async function uploadFile(
  client: S3Client,
  bucket: string,
  key: string,
  body: Buffer | string,
  contentType?: string,
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType || "application/octet-stream",
    }),
  );
}

async function compileLambda(
  name: string,
  entryPoint: string,
): Promise<Buffer> {
  console.log(`  Compiling Lambda: ${name}`);

  const outdir = path.join(DEPLOY_DIR, ".cache", "lambda", name);
  fs.mkdirSync(outdir, { recursive: true });

  await esbuild.build({
    entryPoints: [entryPoint],
    bundle: true,
    platform: "node",
    target: "node20",
    outfile: path.join(outdir, "index.js"),
    external: ["@aws-sdk/*"], // Use Lambda's built-in AWS SDK
    minify: true,
    sourcemap: false,
  });

  // Create zip using archiver
  const zipPath = path.join(outdir, `${name}.zip`);
  await new Promise<void>((resolve, reject) => {
    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => resolve());
    archive.on("error", (err) => reject(err));

    archive.pipe(output);
    archive.file(path.join(outdir, "index.js"), { name: "index.js" });
    archive.finalize();
  });

  return fs.readFileSync(zipPath);
}

type StackState = "exists" | "not_exists" | "failed" | "in_progress";

async function getStackState(): Promise<{
  state: StackState;
  status?: string;
}> {
  try {
    const response = await cfnClientSes.send(
      new DescribeStacksCommand({ StackName: SES_STACK_NAME }),
    );
    const stack = response.Stacks?.[0];
    if (!stack) {
      return { state: "not_exists" };
    }
    const status = stack.StackStatus || "";
    console.log(`  Stack ${SES_STACK_NAME} status: ${status}`);

    // Updatable states
    const updatableStatuses = [
      "CREATE_COMPLETE",
      "UPDATE_COMPLETE",
      "UPDATE_ROLLBACK_COMPLETE",
      "IMPORT_COMPLETE",
      "IMPORT_ROLLBACK_COMPLETE",
    ];
    if (updatableStatuses.includes(status)) {
      return { state: "exists", status };
    }

    // Failed states that need cleanup
    const failedStatuses = [
      "CREATE_FAILED",
      "DELETE_FAILED",
      "ROLLBACK_FAILED",
      "ROLLBACK_COMPLETE",
    ];
    if (failedStatuses.includes(status)) {
      return { state: "failed", status };
    }

    // In progress states - wait
    if (status.includes("IN_PROGRESS")) {
      return { state: "in_progress", status };
    }

    // Default to failed for unknown states
    return { state: "failed", status };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("does not exist")) {
      return { state: "not_exists" };
    }
    throw error;
  }
}

async function showStackFailureEvents(): Promise<void> {
  try {
    const response = await cfnClientSes.send(
      new DescribeStackEventsCommand({
        StackName: SES_STACK_NAME,
      }),
    );
    const failedEvents = response.StackEvents?.filter((e) =>
      e.ResourceStatus?.includes("FAILED"),
    );
    if (failedEvents && failedEvents.length > 0) {
      console.log("\n  Failed resources:");
      for (const event of failedEvents.slice(0, 5)) {
        console.log(
          `    - ${event.LogicalResourceId}: ${event.ResourceStatusReason}`,
        );
      }
    }
  } catch (error) {
    // Ignore errors when fetching events
  }
}

async function cleanupFailedStack(): Promise<void> {
  console.log(`  Cleaning up failed stack ${SES_STACK_NAME}...`);
  await showStackFailureEvents();
  await cfnClientSes.send(
    new DeleteStackCommand({ StackName: SES_STACK_NAME }),
  );
  await waitUntilStackDeleteComplete(
    { client: cfnClientSes, maxWaitTime: 300 },
    { StackName: SES_STACK_NAME },
  );
  console.log("  Cleanup complete");
}

async function verifyDomain(): Promise<void> {
  console.log(`\nChecking domain verification for ${DOMAIN_NAME}...`);

  try {
    const response = await sesClient.send(
      new GetIdentityVerificationAttributesCommand({
        Identities: [DOMAIN_NAME],
      }),
    );

    const status =
      response.VerificationAttributes?.[DOMAIN_NAME]?.VerificationStatus;

    if (status === "Success") {
      console.log(`  Domain ${DOMAIN_NAME} is already verified`);
      return;
    }

    console.log(`  Domain verification status: ${status || "Not started"}`);
    console.log("  Initiating domain verification...");

    const verifyResponse = await sesClient.send(
      new VerifyDomainIdentityCommand({
        Domain: DOMAIN_NAME,
      }),
    );

    console.log(`  Verification token: ${verifyResponse.VerificationToken}`);
    console.log(
      `  Add TXT record: _amazonses.${DOMAIN_NAME} -> ${verifyResponse.VerificationToken}`,
    );
    console.log(
      "  (This may already exist if domain is verified in another region)",
    );
  } catch (error) {
    console.error("  Warning: Could not check domain verification:", error);
  }
}

async function uploadSesTemplate(): Promise<void> {
  console.log("\nUploading SES CloudFormation template...");

  const templatePath = path.join(
    DEPLOY_DIR,
    "resources",
    "SES",
    "ses-email-receiving.yaml",
  );
  const template = fs.readFileSync(templatePath, "utf-8");

  // Upload to main region bucket (template bucket is in main region)
  const key = `resources/SES/ses-email-receiving.yaml`;
  await uploadFile(
    s3ClientMain,
    TEMPLATE_BUCKET,
    key,
    template,
    "application/x-yaml",
  );
  console.log(`  Uploaded: ${key}`);
}

async function uploadSesLambda(): Promise<void> {
  console.log("\nCompiling and uploading SES Email Receiver Lambda...");

  const entryPoint = path.join(BACKEND_DIR, "lambda", "sesEmailReceiver.ts");
  if (!fs.existsSync(entryPoint)) {
    throw new Error(`Lambda file not found: ${entryPoint}`);
  }

  const zip = await compileLambda("sesEmailReceiver", entryPoint);
  const s3Key = `functions/${stage}/sesEmailReceiver.zip`;

  // Upload to main region bucket
  await uploadFile(
    s3ClientMain,
    TEMPLATE_BUCKET,
    s3Key,
    zip,
    "application/zip",
  );
  console.log(`  Uploaded: ${s3Key}`);
}

async function deploySesStack(): Promise<void> {
  console.log("\nDeploying SES Email Receiving stack to us-east-1...");

  const templateUrl = `https://${TEMPLATE_BUCKET}.s3.${MAIN_REGION}.amazonaws.com/resources/SES/ses-email-receiving.yaml`;

  const parameters = [
    { ParameterKey: "Stage", ParameterValue: stage },
    { ParameterKey: "AppName", ParameterValue: APP_NAME },
    { ParameterKey: "DomainName", ParameterValue: DOMAIN_NAME },
    { ParameterKey: "SSMRegion", ParameterValue: MAIN_REGION },
    { ParameterKey: "HostedZoneId", ParameterValue: HOSTED_ZONE_ID },
    { ParameterKey: "TemplateBucketName", ParameterValue: TEMPLATE_BUCKET },
  ];

  let stackState = await getStackState();

  // Handle failed or in-progress stacks
  if (stackState.state === "failed") {
    await cleanupFailedStack();
    stackState = { state: "not_exists" };
  } else if (stackState.state === "in_progress") {
    console.log(
      `  Stack operation in progress (${stackState.status}), waiting...`,
    );
    // Wait for the current operation to complete
    if (stackState.status?.includes("DELETE")) {
      await waitUntilStackDeleteComplete(
        { client: cfnClientSes, maxWaitTime: 300 },
        { StackName: SES_STACK_NAME },
      );
      stackState = { state: "not_exists" };
    } else {
      // Wait and re-check
      await new Promise((resolve) => setTimeout(resolve, 30000));
      stackState = await getStackState();
    }
  }

  try {
    if (stackState.state === "exists") {
      console.log(`  Updating stack: ${SES_STACK_NAME}`);
      await cfnClientSes.send(
        new UpdateStackCommand({
          StackName: SES_STACK_NAME,
          TemplateURL: templateUrl,
          Parameters: parameters,
          Capabilities: ["CAPABILITY_NAMED_IAM"],
          RoleARN: CFN_ROLE_ARN,
        }),
      );
      await waitUntilStackUpdateComplete(
        { client: cfnClientSes, maxWaitTime: 600 },
        { StackName: SES_STACK_NAME },
      );
    } else {
      console.log(`  Creating stack: ${SES_STACK_NAME}`);
      await cfnClientSes.send(
        new CreateStackCommand({
          StackName: SES_STACK_NAME,
          TemplateURL: templateUrl,
          Parameters: parameters,
          Capabilities: ["CAPABILITY_NAMED_IAM"],
          RoleARN: CFN_ROLE_ARN,
          DisableRollback: true,
        }),
      );
      await waitUntilStackCreateComplete(
        { client: cfnClientSes, maxWaitTime: 600 },
        { StackName: SES_STACK_NAME },
      );
    }
    console.log("  Stack deployment complete!");
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message?.includes("No updates are to be performed")
    ) {
      console.log("  No stack updates needed");
    } else {
      // Show failure events before throwing
      await showStackFailureEvents();
      throw error;
    }
  }
}

async function updateLambdaCode(): Promise<void> {
  console.log("\nUpdating Lambda function code...");

  const functionName = `${APP_NAME}-ses-email-receiver-${stage}`;
  // Lambda code bucket is in us-east-1, created by the stack
  const lambdaCodeBucket = `${APP_NAME}-lambda-${stage}-us-east-1`;
  const s3Key = `sesEmailReceiver.zip`;

  try {
    // First, upload the Lambda code to the us-east-1 bucket
    const zipPath = path.join(
      DEPLOY_DIR,
      ".cache",
      "lambda",
      "sesEmailReceiver",
      "sesEmailReceiver.zip",
    );
    if (fs.existsSync(zipPath)) {
      console.log(
        `  Uploading Lambda code to s3://${lambdaCodeBucket}/${s3Key}`,
      );
      const zipContent = fs.readFileSync(zipPath);
      await s3ClientSes.send(
        new PutObjectCommand({
          Bucket: lambdaCodeBucket,
          Key: s3Key,
          Body: zipContent,
          ContentType: "application/zip",
        }),
      );
    }

    // Then update the Lambda function
    await lambdaClientSes.send(
      new GetFunctionCommand({ FunctionName: functionName }),
    );
    await lambdaClientSes.send(
      new UpdateFunctionCodeCommand({
        FunctionName: functionName,
        S3Bucket: lambdaCodeBucket,
        S3Key: s3Key,
      }),
    );
    console.log(`  Updated: ${functionName}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes("ResourceNotFoundException") ||
      errorMessage.includes("Function not found")
    ) {
      console.log(
        `  Lambda not found yet (first deploy) - will be created by CloudFormation`,
      );
    } else {
      console.warn(
        `  Warning: Could not update ${functionName}: ${errorMessage}`,
      );
    }
  }
}

async function activateReceiptRuleSet(): Promise<void> {
  console.log("\nActivating SES Receipt Rule Set...");

  const ruleSetName = `${APP_NAME}-e2e-ruleset-${stage}-v2`;

  try {
    await sesClient.send(
      new SetActiveReceiptRuleSetCommand({
        RuleSetName: ruleSetName,
      }),
    );
    console.log(`  Activated rule set: ${ruleSetName}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("RuleSetDoesNotExist")) {
      console.log(
        `  Rule set ${ruleSetName} does not exist yet - deploy stack first`,
      );
    } else if (errorMessage.includes("AlreadyExists")) {
      console.log(`  Rule set ${ruleSetName} is already active`);
    } else {
      console.warn(`  Warning: Could not activate rule set: ${errorMessage}`);
    }
  }
}

async function main(): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`SES Email Receiving Deployment - Stage: ${stage}`);
  console.log(`Region: ${SES_REGION} (SES) -> ${MAIN_REGION} (SSM)`);
  console.log(`Domain: ${DOMAIN_NAME}`);
  console.log(`${"=".repeat(60)}\n`);

  try {
    // Check AWS credentials first
    console.log("Checking AWS credentials...");
    const { valid } = await checkCredentials();

    if (!valid) {
      const success = await promptForCredentials();
      if (!success) {
        process.exit(1);
      }
    } else {
      console.log("AWS credentials OK\n");
    }

    // Verify domain for SES receiving
    await verifyDomain();

    // Upload template and Lambda
    await uploadSesTemplate();
    await uploadSesLambda();

    // Deploy CloudFormation stack
    await deploySesStack();

    // Update Lambda code (CloudFormation doesn't detect S3 content changes)
    await updateLambdaCode();

    // Activate the receipt rule set
    await activateReceiptRuleSet();

    console.log("\n" + "=".repeat(60));
    console.log("SES Email Receiving deployment complete!");
    console.log("=".repeat(60));
    console.log("\nNext steps:");
    console.log(
      "1. Ensure MX record exists: 10 inbound-smtp.us-east-1.amazonaws.com",
    );
    console.log("2. Verify domain in SES (if not already done)");
    console.log("3. Run E2E tests to verify the flow works");
    console.log("");
  } catch (error) {
    console.error("\nDeployment failed:", error);
    process.exit(1);
  }
}

main();

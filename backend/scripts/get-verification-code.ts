/**
 * Fetch and delete verification code from SSM Parameter Store
 *
 * Usage:
 *   npx tsx backend/scripts/get-verification-code.ts <email> [triggerSource]
 *
 * Example:
 *   npx tsx backend/scripts/get-verification-code.ts test@example.com CustomMessage_SignUp
 *
 * This script:
 * 1. Fetches the verification code from SSM
 * 2. Deletes it immediately (security best practice)
 * 3. Returns the code
 *
 * Can also be imported as a module for E2E tests.
 */

import {
  SSMClient,
  GetParameterCommand,
  DeleteParameterCommand,
} from '@aws-sdk/client-ssm';

const REGION = process.env.AWS_REGION || 'ap-southeast-2';
const STAGE = process.env.STAGE || 'prod';

const ssmClient = new SSMClient({ region: REGION });

interface VerificationCodeData {
  code: string;
  email: string;
  triggerSource: string;
  createdAt: string;
}

/**
 * Sanitize email for SSM parameter name
 */
function sanitizeEmail(email: string): string {
  return email.toLowerCase().replace(/@/g, '-at-').replace(/\./g, '-');
}

/**
 * Get verification code from SSM and delete it
 *
 * @param email - The email address to get the code for
 * @param triggerSource - The Cognito trigger source (default: CustomMessage_SignUp)
 * @param maxRetries - Maximum number of retries (default: 10)
 * @param retryDelayMs - Delay between retries in ms (default: 1000)
 * @returns The verification code or null if not found
 */
export async function getVerificationCode(
  email: string,
  triggerSource: string = 'CustomMessage_SignUp',
  maxRetries: number = 10,
  retryDelayMs: number = 1000
): Promise<string | null> {
  const sanitizedEmail = sanitizeEmail(email);
  const paramName = `/quiz/${STAGE}/e2e/codes/${sanitizedEmail}/${triggerSource}`;

  console.log(`Looking for verification code at: ${paramName}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Try to get the parameter
      const response = await ssmClient.send(
        new GetParameterCommand({
          Name: paramName,
          WithDecryption: true,
        })
      );

      if (response.Parameter?.Value) {
        const data: VerificationCodeData = JSON.parse(response.Parameter.Value);
        console.log(`Found verification code for ${email} (attempt ${attempt})`);

        // Delete the parameter immediately after retrieval
        try {
          await ssmClient.send(
            new DeleteParameterCommand({
              Name: paramName,
            })
          );
          console.log(`Deleted verification code from SSM`);
        } catch (deleteError) {
          console.warn('Warning: Failed to delete code from SSM:', deleteError);
        }

        return data.code;
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // ParameterNotFound is expected while waiting for code
      if (errorMessage.includes('ParameterNotFound')) {
        if (attempt < maxRetries) {
          console.log(
            `Code not found yet (attempt ${attempt}/${maxRetries}), waiting ${retryDelayMs}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          continue;
        }
      } else {
        console.error(`Error fetching code:`, errorMessage);
        throw error;
      }
    }
  }

  console.error(`Verification code not found after ${maxRetries} attempts`);
  return null;
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: npx tsx backend/scripts/get-verification-code.ts <email> [triggerSource]');
    console.error('');
    console.error('Trigger sources:');
    console.error('  CustomMessage_SignUp         - Registration verification code');
    console.error('  CustomMessage_ForgotPassword - Password reset code');
    console.error('  CustomMessage_ResendCode     - Resent verification code');
    process.exit(1);
  }

  const email = args[0];
  const triggerSource = args[1] || 'CustomMessage_SignUp';

  console.log(`\nFetching verification code for: ${email}`);
  console.log(`Trigger source: ${triggerSource}`);
  console.log(`Stage: ${STAGE}`);
  console.log('');

  const code = await getVerificationCode(email, triggerSource);

  if (code) {
    console.log(`\nVerification code: ${code}`);
    process.exit(0);
  } else {
    console.error('\nFailed to retrieve verification code');
    process.exit(1);
  }
}

// Only run CLI if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

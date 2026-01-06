import { SSMClient, PutParameterCommand } from '@aws-sdk/client-ssm';
import type { CustomMessageTriggerEvent, CustomMessageTriggerHandler } from 'aws-lambda';

const ssmClient = new SSMClient({});
const STAGE = process.env.STAGE || 'dev';

/**
 * Custom Message Lambda Trigger
 *
 * This trigger intercepts Cognito messages (sign-up verification, forgot password)
 * and stores the verification code in SSM Parameter Store for E2E testing.
 *
 * The code is stored at:
 *   /quiz/{stage}/e2e/codes/{email}/{triggerSource}
 *
 * Security:
 * - SSM has different IAM permissions than DynamoDB
 * - Only E2E test role has GetParameter/DeleteParameter access
 * - Codes are deleted immediately after retrieval by E2E tests
 */
export const handler: CustomMessageTriggerHandler = async (event: CustomMessageTriggerEvent) => {
  console.log('CustomMessage trigger:', JSON.stringify(event, null, 2));

  const { triggerSource, request } = event;
  const email = request.userAttributes.email;
  const code = request.codeParameter;

  // Store codes for: CustomMessage_SignUp, CustomMessage_ForgotPassword, CustomMessage_ResendCode
  if (code && email) {
    try {
      // Sanitize email for SSM parameter name (replace @ and . with -)
      const sanitizedEmail = email.toLowerCase().replace(/@/g, '-at-').replace(/\./g, '-');
      const paramName = `/quiz/${STAGE}/e2e/codes/${sanitizedEmail}/${triggerSource}`;

      await ssmClient.send(new PutParameterCommand({
        Name: paramName,
        Value: JSON.stringify({
          code,
          email: email.toLowerCase(),
          triggerSource,
          createdAt: new Date().toISOString(),
        }),
        Type: 'SecureString',
        Overwrite: true,
      }));

      console.log(`Stored verification code in SSM for ${email} (trigger: ${triggerSource})`);
    } catch (error) {
      // Log but don't fail - email should still be sent
      console.error('Failed to store verification code in SSM:', error);
    }
  }

  // Return event unchanged - Cognito will still send the email as normal
  return event;
};

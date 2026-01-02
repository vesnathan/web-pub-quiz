import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import type { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from 'aws-lambda';

const cognitoClient = new CognitoIdentityProviderClient({});

/**
 * Pre Sign-Up Lambda Trigger
 *
 * This trigger handles account conflicts for users with the same email:
 *
 * Case 1: External provider (Google) sign-up when native account exists
 *   - Reject with NATIVE_ACCOUNT_EXISTS error
 *   - User should sign in with email/password instead
 *
 * Case 2: Native sign-up when external provider account exists
 *   - Reject with GOOGLE_ACCOUNT_EXISTS error
 *   - User should sign in with Google instead
 */
export const handler: PreSignUpTriggerHandler = async (event: PreSignUpTriggerEvent) => {
  console.log('PreSignUp trigger:', JSON.stringify(event, null, 2));

  const { triggerSource, request, userPoolId } = event;
  const email = request.userAttributes.email;

  // Handle native sign-ups - check if external provider account exists
  if (triggerSource === 'PreSignUp_SignUp') {
    try {
      const existingUsers = await cognitoClient.send(new ListUsersCommand({
        UserPoolId: userPoolId,
        Filter: `email = "${email}"`,
        Limit: 10,
      }));

      console.log('Checking for external provider accounts:', JSON.stringify(existingUsers.Users, null, 2));

      // Find external provider user (Google, etc.)
      const externalUser = existingUsers.Users?.find(user => {
        const username = user.Username?.toLowerCase() || '';
        return username.startsWith('google_') ||
               username.startsWith('facebook_') ||
               username.startsWith('loginwithamazon_');
      });

      if (externalUser) {
        console.log('Found existing external provider user:', externalUser.Username);
        // Tell user to sign in with Google instead
        throw new Error('GOOGLE_ACCOUNT_EXISTS');
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'GOOGLE_ACCOUNT_EXISTS') {
        throw error;
      }
      console.error('Error checking for external accounts:', error);
      // Don't block signup on errors - let normal flow proceed
    }

    return event;
  }

  // Only process external provider sign-ups (e.g., Google) below this point
  if (triggerSource !== 'PreSignUp_ExternalProvider') {
    return event;
  }

  // This is an external provider sign-up (Google, etc.)
  // Check if a native user with this email already exists
  try {
    const existingUsers = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 10,
    }));

    console.log('Existing users with email:', JSON.stringify(existingUsers.Users, null, 2));

    // Find native Cognito user (not a federated user)
    const nativeUser = existingUsers.Users?.find(user => {
      // Native users have username that matches their sub or is email-like
      // Federated users have usernames like "Google_123456789"
      const username = user.Username || '';
      return !username.startsWith('Google_') &&
             !username.startsWith('Facebook_') &&
             !username.startsWith('LoginWithAmazon_');
    });

    if (nativeUser) {
      console.log('Found existing native user:', nativeUser.Username);
      // Tell user to sign in with email/password instead
      throw new Error('NATIVE_ACCOUNT_EXISTS');
    }

    // No existing native user found - allow the external provider sign-up to proceed
    // Auto-verify email since it comes from a trusted provider
    event.response.autoVerifyEmail = true;
    event.response.autoConfirmUser = true;

    return event;
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'NATIVE_ACCOUNT_EXISTS') {
      // Re-throw our custom error
      throw error;
    }
    console.error('Error in PreSignUp trigger:', error);
    // Don't block sign-up on errors - let it proceed
    event.response.autoVerifyEmail = true;
    event.response.autoConfirmUser = true;
    return event;
  }
};

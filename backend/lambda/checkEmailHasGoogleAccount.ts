import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const cognitoClient = new CognitoIdentityProviderClient({});

interface LambdaPayload {
  arguments: {
    email: string;
  };
}

/**
 * Checks if an email address is associated with a Google account in Cognito.
 * Used to provide helpful error messages during native login attempts.
 */
export const handler = async (event: LambdaPayload): Promise<boolean> => {
  const { email } = event.arguments;
  const userPoolId = process.env.USER_POOL_ID;

  if (!userPoolId) {
    console.error('USER_POOL_ID not configured');
    return false;
  }

  try {
    const result = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: userPoolId,
      Filter: `email = "${email}"`,
      Limit: 10,
    }));

    // Check if any user is a Google account
    const hasGoogleAccount = result.Users?.some(user => {
      const username = user.Username?.toLowerCase() || '';
      return username.startsWith('google_');
    }) || false;

    return hasGoogleAccount;
  } catch (error) {
    console.error('Error checking for Google account:', error);
    return false;
  }
};

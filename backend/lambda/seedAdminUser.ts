import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminAddUserToGroupCommand,
  AdminGetUserCommand,
  AdminSetUserPasswordCommand,
  UsernameExistsException,
} from '@aws-sdk/client-cognito-identity-provider';
import type { CloudFormationCustomResourceEvent, CloudFormationCustomResourceResponse } from 'aws-lambda';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);
const cognitoClient = new CognitoIdentityProviderClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const USER_POOL_ID = process.env.USER_POOL_ID!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD!;

interface UserSubscription {
  tier: number;
  status: string | null;
  provider: string | null;
  subscriptionId: string | null;
  customerId: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
}

interface UserProfile {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  GSI2PK: string;
  GSI2SK: string;
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  stats: {
    totalCorrect: number;
    totalWrong: number;
    totalPoints: number;
    setsPlayed: number;
    setsWon: number;
    currentStreak: number;
    longestStreak: number;
  };
  subscription: UserSubscription;
  isAdmin: boolean;
}

async function getUserIdFromCognito(email: string): Promise<string | null> {
  try {
    const result = await cognitoClient.send(new AdminGetUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
    }));
    return result.UserAttributes?.find(attr => attr.Name === 'sub')?.Value || null;
  } catch {
    return null;
  }
}

async function createCognitoUser(email: string, password: string): Promise<string> {
  try {
    // Try to create the user
    const createResult = await cognitoClient.send(new AdminCreateUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'true' },
      ],
      MessageAction: 'SUPPRESS', // Don't send welcome email
    }));

    const userId = createResult.User?.Attributes?.find(attr => attr.Name === 'sub')?.Value;
    if (!userId) {
      throw new Error('Failed to get user ID after creation');
    }

    // Set permanent password
    await cognitoClient.send(new AdminSetUserPasswordCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      Password: password,
      Permanent: true,
    }));

    console.log(`Created Cognito user: ${email} with ID: ${userId}`);
    return userId;
  } catch (error) {
    if (error instanceof UsernameExistsException) {
      // User already exists, get their ID
      const existingId = await getUserIdFromCognito(email);
      if (existingId) {
        console.log(`Cognito user already exists: ${email} with ID: ${existingId}`);
        return existingId;
      }
      throw new Error('User exists but could not retrieve ID');
    }
    throw error;
  }
}

async function addUserToAdminGroup(email: string): Promise<void> {
  try {
    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: email,
      GroupName: 'SiteAdmin',
    }));
    console.log(`Added ${email} to SiteAdmin group`);
  } catch (error) {
    console.error('Error adding user to admin group:', error);
    throw error;
  }
}

async function createOrUpdateUserProfile(userId: string, email: string): Promise<void> {
  const now = new Date().toISOString();
  const displayName = 'Admin';

  // Check if profile already exists
  const existing = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    },
  }));

  if (existing.Item) {
    console.log(`User profile already exists for ${email}`);
    return;
  }

  const userProfile: UserProfile = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    GSI1PK: 'USER',
    GSI1SK: `${now}#${userId}`,
    GSI2PK: `DISPLAYNAME#${displayName.toLowerCase()}`,
    GSI2SK: 'USER',
    id: userId,
    email,
    displayName,
    createdAt: now,
    stats: {
      totalCorrect: 0,
      totalWrong: 0,
      totalPoints: 0,
      setsPlayed: 0,
      setsWon: 0,
      currentStreak: 0,
      longestStreak: 0,
    },
    subscription: {
      tier: 2, // Champion tier for admin
      status: 'active',
      provider: null, // Manual/admin subscription
      subscriptionId: null,
      customerId: null,
      startedAt: now,
      expiresAt: null,
      cancelledAt: null,
    },
    isAdmin: true,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: userProfile,
  }));

  console.log(`Created user profile for admin: ${email}`);
}

async function sendResponse(
  event: CloudFormationCustomResourceEvent,
  status: 'SUCCESS' | 'FAILED',
  reason?: string,
  data?: Record<string, string>
): Promise<void> {
  const responseBody: CloudFormationCustomResourceResponse = {
    Status: status,
    Reason: reason || 'See CloudWatch logs',
    PhysicalResourceId: event.PhysicalResourceId || `admin-seeder-${Date.now()}`,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: data,
  };

  const responseUrl = event.ResponseURL;
  console.log('Sending response to:', responseUrl);
  console.log('Response body:', JSON.stringify(responseBody));

  const response = await fetch(responseUrl, {
    method: 'PUT',
    headers: { 'Content-Type': '' },
    body: JSON.stringify(responseBody),
  });

  console.log('Response status:', response.status);
}

export const handler = async (event: CloudFormationCustomResourceEvent): Promise<void> => {
  console.log('AdminSeeder event:', JSON.stringify(event, null, 2));

  try {
    if (event.RequestType === 'Delete') {
      // Don't delete the admin user on stack deletion
      await sendResponse(event, 'SUCCESS');
      return;
    }

    // Create or Update
    const userId = await createCognitoUser(ADMIN_EMAIL, ADMIN_PASSWORD);
    await addUserToAdminGroup(ADMIN_EMAIL);
    await createOrUpdateUserProfile(userId, ADMIN_EMAIL);

    await sendResponse(event, 'SUCCESS', undefined, { AdminUserId: userId });
  } catch (error) {
    console.error('Error seeding admin user:', error);
    await sendResponse(event, 'FAILED', `${error}`);
  }
};

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { PostConfirmationTriggerEvent, PostConfirmationTriggerHandler } from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

interface UserSubscription {
  tier: number;
  status: string | null;
  provider: string | null;
  subscriptionId: string | null;
  customerId: string | null;
  startedAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  // Gift subscription fields
  giftedBy: string | null;
  giftedByName: string | null;
  giftedAt: string | null;
  giftExpiresAt: string | null;
  giftNotificationSeen: boolean | null;
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
}

// 1 week in milliseconds
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function createWelcomeSubscription(now: string): UserSubscription {
  const expiresAt = new Date(Date.parse(now) + ONE_WEEK_MS).toISOString();

  return {
    tier: 1, // Supporter tier for welcome gift
    status: 'active',
    provider: null,
    subscriptionId: null,
    customerId: null,
    startedAt: now,
    expiresAt: expiresAt,
    cancelledAt: null,
    // Gift info - "system" indicates welcome bonus
    giftedBy: 'system',
    giftedByName: 'Quiz Night Live',
    giftedAt: now,
    giftExpiresAt: expiresAt,
    giftNotificationSeen: false,
  };
}

async function checkDisplayNameExists(displayName: string): Promise<boolean> {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `DISPLAYNAME#${displayName.toLowerCase()}`,
    },
    Limit: 1,
  }));
  return (result.Items?.length ?? 0) > 0;
}

async function generateUniqueDisplayName(preferredName: string): Promise<string> {
  // Check if base name is available
  if (!(await checkDisplayNameExists(preferredName))) {
    return preferredName;
  }

  // Add random suffix to make it unique
  for (let i = 0; i < 10; i++) {
    const suffix = Math.floor(Math.random() * 1000);
    const candidateName = `${preferredName}${suffix}`;
    if (!(await checkDisplayNameExists(candidateName))) {
      return candidateName;
    }
  }

  // Fallback to timestamp-based name
  return `Player${Date.now() % 100000}`;
}

export const handler: PostConfirmationTriggerHandler = async (event: PostConfirmationTriggerEvent) => {
  console.log('PostConfirmation trigger:', JSON.stringify(event, null, 2));

  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;
  // Get display name from preferred_username (native signup) or name (Google OAuth)
  const preferredDisplayName = event.request.userAttributes.preferred_username
    || event.request.userAttributes.name
    || event.request.userAttributes.given_name;
  const now = new Date().toISOString();

  try {
    // Generate unique display name - use preferred if available, otherwise derive from email
    const fallbackName = email.split('@')[0];
    const displayName = await generateUniqueDisplayName(preferredDisplayName || fallbackName);

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
      subscription: createWelcomeSubscription(now),
    };

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: userProfile,
      ConditionExpression: 'attribute_not_exists(PK)',
    }));

    console.log(`Created user profile for ${userId} with displayName ${displayName}`);
  } catch (error) {
    console.error('Error creating user profile:', error);
    // Don't throw - let the user sign up succeed even if profile creation fails
    // The profile can be created later on first login via ensureProfile
  }

  return event;
};

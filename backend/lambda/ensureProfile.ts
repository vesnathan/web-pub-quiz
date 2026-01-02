import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { AppSyncResolverEvent } from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME!;

interface EnsureProfileArgs {
  displayName: string;
}

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
}

const DEFAULT_SUBSCRIPTION: UserSubscription = {
  tier: 0,
  status: null,
  provider: null,
  subscriptionId: null,
  customerId: null,
  startedAt: null,
  expiresAt: null,
  cancelledAt: null,
};

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

export const handler = async (event: AppSyncResolverEvent<EnsureProfileArgs>) => {
  console.log('EnsureProfile event:', JSON.stringify(event, null, 2));

  const identity = event.identity && 'claims' in event.identity ? event.identity : null;
  const userId = identity?.sub || null;
  const email = identity?.claims?.email || null;
  // Google OAuth provides name from Google account
  const googleName = identity?.claims?.name || identity?.claims?.given_name || null;

  if (!userId) {
    throw new Error('Unauthorized: No user ID found');
  }

  // First, check if profile already exists
  const existingProfile = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    },
  }));

  if (existingProfile.Item) {
    // Profile already exists, return it
    console.log('Profile already exists for user:', userId);
    return {
      id: existingProfile.Item.id,
      email: existingProfile.Item.email,
      displayName: existingProfile.Item.displayName,
      createdAt: existingProfile.Item.createdAt,
      stats: existingProfile.Item.stats,
      subscription: existingProfile.Item.subscription || DEFAULT_SUBSCRIPTION,
    };
  }

  // Profile doesn't exist, create it
  // Prefer Google name if available, then fall back to provided displayName argument
  const preferredDisplayName = googleName || event.arguments.displayName;
  const displayName = await generateUniqueDisplayName(preferredDisplayName);
  const now = new Date().toISOString();

  const userProfile: UserProfile = {
    PK: `USER#${userId}`,
    SK: 'PROFILE',
    GSI1PK: 'USER',
    GSI1SK: `${now}#${userId}`,
    GSI2PK: `DISPLAYNAME#${displayName.toLowerCase()}`,
    GSI2SK: 'USER',
    id: userId,
    email: email || '',
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
    subscription: DEFAULT_SUBSCRIPTION,
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: userProfile,
      ConditionExpression: 'attribute_not_exists(PK)',
    }));

    console.log(`Created profile for ${userId} with displayName ${displayName}`);
  } catch (error: unknown) {
    // If condition failed, profile was created by another request - fetch and return it
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ConditionalCheckFailedException') {
      console.log('Profile was created by another request, fetching...');
      const profile = await docClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
      }));

      if (profile.Item) {
        return {
          id: profile.Item.id,
          email: profile.Item.email,
          displayName: profile.Item.displayName,
          createdAt: profile.Item.createdAt,
          stats: profile.Item.stats,
          subscription: profile.Item.subscription || DEFAULT_SUBSCRIPTION,
        };
      }
    }
    throw error;
  }

  return {
    id: userProfile.id,
    email: userProfile.email,
    displayName: userProfile.displayName,
    createdAt: userProfile.createdAt,
    stats: userProfile.stats,
    subscription: userProfile.subscription,
  };
};

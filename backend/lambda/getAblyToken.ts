import Ably from 'ably';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const ABLY_API_KEY = process.env.ABLY_API_KEY!;
const TABLE_NAME = process.env.TABLE_NAME!;

// Ably channel prefix for user-specific channels
const ABLY_USER_CHANNEL_PREFIX = 'quiz:user:';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface Event {
  userId: string;
  username: string;
  sourceIp?: string;
}

interface TokenResponse {
  token: string;
  expires: string;
  duplicateSession?: boolean;
  duplicateIp?: boolean;
}

interface ActiveSession {
  PK: string;
  SK: string;
  userId: string;
  username: string;
  sessionId: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  ttl: number;
}

let ablyRest: Ably.Rest | null = null;

function getAblyRest(): Ably.Rest {
  if (!ablyRest) {
    ablyRest = new Ably.Rest({ key: ABLY_API_KEY });
  }
  return ablyRest;
}

// Send a kick message to the user's private channel
async function sendKickMessage(userId: string, reason: string): Promise<void> {
  try {
    const ably = getAblyRest();
    const channel = ably.channels.get(`${ABLY_USER_CHANNEL_PREFIX}${userId}`);
    await channel.publish('session_kicked', {
      reason,
      timestamp: Date.now(),
    });
    console.log(`Sent session_kicked message to user ${userId}`);
  } catch (error) {
    console.error('Error sending kick message:', error);
  }
}

// Generate a unique session ID
function generateSessionId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Check for existing active sessions for this user
async function checkExistingSession(userId: string): Promise<ActiveSession | null> {
  try {
    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ACTIVESESSION#${userId}`,
        SK: 'CURRENT',
      },
    }));
    return result.Item as ActiveSession | null;
  } catch (error) {
    console.error('Error checking existing session:', error);
    return null;
  }
}

// Check if this IP is already associated with a different user
async function checkIpAssociation(ipAddress: string, userId: string): Promise<{ isDuplicate: boolean; otherUserId?: string }> {
  if (!ipAddress) {
    return { isDuplicate: false };
  }

  try {
    // Query for active sessions with this IP
    const result = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :ipPk',
      ExpressionAttributeValues: {
        ':ipPk': `IP#${ipAddress}`,
      },
      Limit: 10, // Check a few recent sessions
    }));

    if (result.Items && result.Items.length > 0) {
      // Check if any session belongs to a different user
      for (const item of result.Items) {
        if (item.userId !== userId) {
          console.log(`IP ${ipAddress} is already used by user ${item.userId}, but ${userId} is trying to use it`);
          return { isDuplicate: true, otherUserId: item.userId };
        }
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('Error checking IP association:', error);
    return { isDuplicate: false };
  }
}

// Store the active session
async function storeActiveSession(
  userId: string,
  username: string,
  sessionId: string,
  ipAddress: string,
  expiresAt: string
): Promise<void> {
  const now = new Date();
  const ttl = Math.floor(new Date(expiresAt).getTime() / 1000); // Unix timestamp for TTL

  const session: ActiveSession = {
    PK: `ACTIVESESSION#${userId}`,
    SK: 'CURRENT',
    userId,
    username,
    sessionId,
    ipAddress: ipAddress || 'unknown',
    createdAt: now.toISOString(),
    expiresAt,
    ttl,
  };

  // Also add GSI1 for IP-based lookup
  const itemWithGSI = {
    ...session,
    GSI1PK: ipAddress ? `IP#${ipAddress}` : 'IP#unknown',
    GSI1SK: `SESSION#${userId}`,
  };

  try {
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: itemWithGSI,
    }));
    console.log(`Stored active session for user ${userId} from IP ${ipAddress}`);
  } catch (error) {
    console.error('Error storing active session:', error);
  }
}

// Invalidate a previous session (for when we detect duplicate login)
async function invalidatePreviousSession(userId: string): Promise<void> {
  try {
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `ACTIVESESSION#${userId}`,
        SK: 'CURRENT',
      },
    }));
    console.log(`Invalidated previous session for user ${userId}`);
  } catch (error) {
    console.error('Error invalidating previous session:', error);
  }
}

export async function handler(event: Event): Promise<TokenResponse> {
  console.log('getAblyToken called for user:', event.userId, 'from IP:', event.sourceIp);

  const ably = getAblyRest();
  const sessionId = generateSessionId();
  const ipAddress = event.sourceIp || 'unknown';

  // Check for existing session (duplicate login detection)
  const existingSession = await checkExistingSession(event.userId);
  let duplicateSession = false;

  if (existingSession) {
    console.log(`User ${event.userId} already has an active session from ${existingSession.ipAddress}`);
    duplicateSession = true;
    // Send kick message to the old session before invalidating
    await sendKickMessage(event.userId, 'You have logged in from another device or browser.');
    // Invalidate the old session - new login takes precedence
    await invalidatePreviousSession(event.userId);
  }

  // Check for duplicate IP (same IP, different user)
  const ipCheck = await checkIpAssociation(ipAddress, event.userId);
  const duplicateIp = ipCheck.isDuplicate;

  if (duplicateIp) {
    console.warn(`ANTI-CHEAT: IP ${ipAddress} is being used by multiple users. Current: ${event.userId}, Previous: ${ipCheck.otherUserId}`);
    // We log but still allow - the frontend can show a warning
  }

  // Create token request with user's identity
  const tokenRequest = await ably.auth.createTokenRequest({
    clientId: event.userId,
    capability: {
      // Allow access to room channels (subscribe, publish, presence)
      'quiz:room:*': ['subscribe', 'publish', 'presence'],
      // Allow subscribing to user-specific channel for session management
      [`${ABLY_USER_CHANNEL_PREFIX}${event.userId}`]: ['subscribe'],
      // Legacy: Allow subscribing to game channel (can be removed later)
      'quiz:game': ['subscribe', 'presence'],
      'quiz:game:*': ['publish'],
    },
    ttl: 3600 * 1000, // 1 hour
  });

  // Convert token request to actual token
  const tokenDetails = await ably.auth.requestToken(tokenRequest);

  if (!tokenDetails.token) {
    throw new Error('Failed to generate Ably token');
  }

  const expiresAt = new Date(tokenDetails.expires || Date.now() + 3600 * 1000);

  // Store the active session
  await storeActiveSession(
    event.userId,
    event.username,
    sessionId,
    ipAddress,
    expiresAt.toISOString()
  );

  return {
    token: tokenDetails.token,
    expires: expiresAt.toISOString(),
    duplicateSession,
    duplicateIp,
  };
}

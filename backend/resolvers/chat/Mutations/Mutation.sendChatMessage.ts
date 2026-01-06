import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.sendChatMessage
 *
 * Creates a new chat message in the specified channel.
 * For DM conversations (channelId starts with "DM#"), also updates:
 * - The main conversation record with lastMessage and updatedAt
 * - Both users' USERCONV index entries with lastMessage and updatedAt
 *
 * @module resolvers/chat/Mutations
 */

type Identity = {
  sub: string;
  username: string;
  claims: {
    "custom:displayName"?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    email?: string;
  };
};

type Args = {
  channelId: string;
  content: string;
};

/**
 * Prepares DynamoDB operation for a new chat message.
 * For DM conversations, uses TransactWriteItems to also update conversation metadata.
 *
 * @param ctx - AppSync context containing channelId, content, and user identity
 * @returns DynamoDB request configuration
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as Identity;
  const { channelId, content } = ctx.arguments;
  const messageId = util.autoId();
  const timestamp = util.time.nowISO8601();

  // Get display name with multiple fallbacks for different auth providers
  let displayName = identity.claims["custom:displayName"];
  if (!displayName) {
    displayName = identity.claims.name;
  }
  if (!displayName && identity.claims.given_name) {
    displayName = identity.claims.family_name
      ? `${identity.claims.given_name} ${identity.claims.family_name}`
      : identity.claims.given_name;
  }
  if (!displayName && identity.claims.email) {
    displayName = identity.claims.email.split("@")[0];
  }
  if (!displayName) {
    displayName = identity.username;
  }

  // Build the message object
  const message = {
    id: messageId,
    channelId: channelId,
    senderId: identity.sub,
    senderUsername: identity.username,
    senderDisplayName: displayName,
    content: content,
    createdAt: timestamp,
  };

  // Store for response handler
  ctx.stash.message = message;

  // Check if this is a DM conversation (format: DM#userId1#userId2)
  const isDM = channelId.startsWith("DM#");

  if (isDM) {
    // Extract user IDs from conversation ID
    const parts = channelId.split("#");
    const userId1 = parts[1];
    const userId2 = parts[2];

    // Use TransactWriteItems to atomically:
    // 1. Create the message
    // 2. Update the main conversation record
    // 3. Update both users' USERCONV entries
    return {
      operation: "TransactWriteItems",
      transactItems: [
        // 1. Create the chat message
        {
          table: "QuizNightTable",
          operation: "PutItem",
          key: util.dynamodb.toMapValues({
            PK: `CHAT#${channelId}`,
            SK: `MSG#${timestamp}#${messageId}`,
          }),
          attributeValues: util.dynamodb.toMapValues(message),
        },
        // 2. Update main conversation record
        {
          table: "QuizNightTable",
          operation: "UpdateItem",
          key: util.dynamodb.toMapValues({
            PK: `CONV#${channelId}`,
            SK: "META",
          }),
          update: {
            expression: "SET lastMessage = :msg, updatedAt = :ts",
            expressionValues: util.dynamodb.toMapValues({
              ":msg": message,
              ":ts": timestamp,
            }),
          },
        },
        // 3. Update user 1's USERCONV entry
        {
          table: "QuizNightTable",
          operation: "UpdateItem",
          key: util.dynamodb.toMapValues({
            PK: `USERCONV#${userId1}`,
            SK: `CONV#${channelId}`,
          }),
          update: {
            expression: "SET lastMessage = :msg, updatedAt = :ts",
            expressionValues: util.dynamodb.toMapValues({
              ":msg": message,
              ":ts": timestamp,
            }),
          },
        },
        // 4. Update user 2's USERCONV entry
        {
          table: "QuizNightTable",
          operation: "UpdateItem",
          key: util.dynamodb.toMapValues({
            PK: `USERCONV#${userId2}`,
            SK: `CONV#${channelId}`,
          }),
          update: {
            expression: "SET lastMessage = :msg, updatedAt = :ts",
            expressionValues: util.dynamodb.toMapValues({
              ":msg": message,
              ":ts": timestamp,
            }),
          },
        },
      ],
    };
  }

  // For non-DM channels (like lobby), just create the message
  return {
    operation: "PutItem",
    key: util.dynamodb.toMapValues({
      PK: `CHAT#${channelId}`,
      SK: `MSG#${timestamp}#${messageId}`,
    }),
    attributeValues: util.dynamodb.toMapValues(message),
  };
}

/**
 * Processes DynamoDB response and returns the created chat message.
 *
 * @param ctx - AppSync context containing DynamoDB result
 * @returns The created chat message
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }
  // Return the message from stash (works for both PutItem and TransactWriteItems)
  return ctx.stash.message;
}

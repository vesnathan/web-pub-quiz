import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.startConversation
 *
 * Creates or retrieves a direct message conversation between two users.
 * Uses a deterministic conversation ID based on sorted user IDs.
 * Uses TransactWriteItems to atomically create:
 * - The conversation record at CONV#${conversationId}/META
 * - User index entries at USERCONV#${userId}/CONV#${conversationId} for both participants
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
  targetUserId: string;
  targetDisplayName: string;
};

/**
 * Uses TransactWriteItems to atomically create/check the conversation and user index entries.
 *
 * @param ctx - AppSync context containing targetUserId, targetDisplayName and user identity
 * @returns DynamoDB TransactWriteItems request configuration
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as Identity;
  const { targetUserId, targetDisplayName } = ctx.arguments;
  const currentUserId = identity.sub;
  const timestamp = util.time.nowISO8601();

  // Get current user's display name with fallbacks
  let currentDisplayName = identity.claims["custom:displayName"];
  if (!currentDisplayName) {
    currentDisplayName = identity.claims.name;
  }
  if (!currentDisplayName && identity.claims.given_name) {
    currentDisplayName = identity.claims.family_name
      ? `${identity.claims.given_name} ${identity.claims.family_name}`
      : identity.claims.given_name;
  }
  if (!currentDisplayName && identity.claims.email) {
    currentDisplayName = identity.claims.email.split("@")[0];
  }
  if (!currentDisplayName) {
    currentDisplayName = identity.username;
  }

  // Create a deterministic conversation ID from sorted user IDs
  let conversationId: string;
  let sortedIds: string[];
  if (currentUserId < targetUserId) {
    conversationId = `DM#${currentUserId}#${targetUserId}`;
    sortedIds = [currentUserId, targetUserId];
  } else {
    conversationId = `DM#${targetUserId}#${currentUserId}`;
    sortedIds = [targetUserId, currentUserId];
  }

  // Build participant data for storage
  const currentUserParticipant = {
    id: currentUserId,
    displayName: currentDisplayName,
  };
  const targetUserParticipant = {
    id: targetUserId,
    displayName: targetDisplayName,
  };

  // Store for response handler
  ctx.stash.conversationId = conversationId;
  ctx.stash.participantIds = sortedIds;
  ctx.stash.currentUserId = currentUserId;
  ctx.stash.currentDisplayName = currentDisplayName;
  ctx.stash.targetUserId = targetUserId;
  ctx.stash.targetDisplayName = targetDisplayName;
  ctx.stash.timestamp = timestamp;

  // Conversation data to store
  const conversationData = {
    id: conversationId,
    participantIds: sortedIds,
    updatedAt: timestamp,
  };

  // User index entry data (includes conversation data for denormalized access)
  const userConvEntry = {
    id: conversationId,
    participantIds: sortedIds,
    participants: [currentUserParticipant, targetUserParticipant],
    updatedAt: timestamp,
  };

  return {
    operation: "TransactWriteItems",
    transactItems: [
      // 1. Create/update main conversation record
      {
        table: "QuizNightTable",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({
          PK: `CONV#${conversationId}`,
          SK: "META",
        }),
        update: {
          expression:
            "SET id = if_not_exists(id, :id), participantIds = if_not_exists(participantIds, :pids), updatedAt = if_not_exists(updatedAt, :ts)",
          expressionValues: util.dynamodb.toMapValues({
            ":id": conversationId,
            ":pids": sortedIds,
            ":ts": timestamp,
          }),
        },
      },
      // 2. Create user index entry for current user
      {
        table: "QuizNightTable",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({
          PK: `USERCONV#${currentUserId}`,
          SK: `CONV#${conversationId}`,
        }),
        update: {
          expression:
            "SET id = if_not_exists(id, :id), participantIds = if_not_exists(participantIds, :pids), participants = if_not_exists(participants, :parts), updatedAt = if_not_exists(updatedAt, :ts)",
          expressionValues: util.dynamodb.toMapValues({
            ":id": conversationId,
            ":pids": sortedIds,
            ":parts": [currentUserParticipant, targetUserParticipant],
            ":ts": timestamp,
          }),
        },
      },
      // 3. Create user index entry for target user
      {
        table: "QuizNightTable",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({
          PK: `USERCONV#${targetUserId}`,
          SK: `CONV#${conversationId}`,
        }),
        update: {
          expression:
            "SET id = if_not_exists(id, :id), participantIds = if_not_exists(participantIds, :pids), participants = if_not_exists(participants, :parts), updatedAt = if_not_exists(updatedAt, :ts)",
          expressionValues: util.dynamodb.toMapValues({
            ":id": conversationId,
            ":pids": sortedIds,
            ":parts": [currentUserParticipant, targetUserParticipant],
            ":ts": timestamp,
          }),
        },
      },
    ],
  };
}

/**
 * Processes DynamoDB response and returns the conversation with participant info.
 *
 * @param ctx - AppSync context containing DynamoDB result
 * @returns The conversation object with participant info
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const conversationId = ctx.stash.conversationId as string;
  const participantIds = ctx.stash.participantIds as string[];
  const currentUserId = ctx.stash.currentUserId as string;
  const currentDisplayName = ctx.stash.currentDisplayName as string;
  const targetUserId = ctx.stash.targetUserId as string;
  const targetDisplayName = ctx.stash.targetDisplayName as string;
  const timestamp = ctx.stash.timestamp as string;

  // Build participant objects with actual display names
  const participants = [
    { id: currentUserId, displayName: currentDisplayName },
    { id: targetUserId, displayName: targetDisplayName },
  ];

  return {
    id: conversationId,
    participantIds: participantIds,
    participants: participants,
    updatedAt: timestamp,
    lastMessage: null,
  };
}

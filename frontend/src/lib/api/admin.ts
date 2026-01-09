/**
 * Admin API functions
 * Wraps GraphQL operations with Zod validation
 */
import { graphqlClient } from "@/lib/graphql";
import {
  ADMIN_GIFT_SUBSCRIPTION,
  ADMIN_UPDATE_USER_TIER,
  UPDATE_GAME_CONFIG,
} from "@/graphql/mutations";
import { GET_WEBHOOK_LOGS, GET_GAME_CONFIG } from "@/graphql/queries";
import type {
  User,
  WebhookLogConnection,
  GiftSubscriptionInput,
} from "@quiz/shared";
import {
  UserSchema,
  WebhookLogConnectionSchema,
} from "@/schemas/ValidationSchemas";

interface AdminGiftSubscriptionResponse {
  data?: {
    adminGiftSubscription?: unknown;
  };
}

/**
 * Gift a subscription to a user (admin only)
 * Returns the updated User
 */
export async function adminGiftSubscription(
  input: GiftSubscriptionInput,
): Promise<User | null> {
  const result = (await graphqlClient.graphql({
    query: ADMIN_GIFT_SUBSCRIPTION,
    variables: { input },
  })) as AdminGiftSubscriptionResponse;

  if (!result.data?.adminGiftSubscription) {
    return null;
  }

  return UserSchema.parse(result.data.adminGiftSubscription) as User;
}

interface AdminUpdateUserTierResponse {
  data?: {
    adminUpdateUserTier?: unknown;
  };
}

/**
 * Update a user's subscription tier (admin only)
 * Returns the updated User
 */
export async function adminUpdateUserTier(
  userId: string,
  tier: number,
): Promise<User | null> {
  const result = (await graphqlClient.graphql({
    query: ADMIN_UPDATE_USER_TIER,
    variables: { userId, tier },
  })) as AdminUpdateUserTierResponse;

  if (!result.data?.adminUpdateUserTier) {
    return null;
  }

  return UserSchema.parse(result.data.adminUpdateUserTier) as User;
}

interface GetWebhookLogsResponse {
  data?: {
    getWebhookLogs?: unknown;
  };
}

export interface GetWebhookLogsInput {
  provider?: string | null;
  limit?: number;
  nextToken?: string | null;
}

/**
 * Get webhook logs (admin only)
 */
export async function getWebhookLogs(
  input: GetWebhookLogsInput = {},
): Promise<WebhookLogConnection> {
  const result = (await graphqlClient.graphql({
    query: GET_WEBHOOK_LOGS,
    variables: {
      provider: input.provider,
      limit: input.limit ?? 50,
      nextToken: input.nextToken,
    },
  })) as GetWebhookLogsResponse;

  if (!result.data?.getWebhookLogs) {
    return { items: [], nextToken: null };
  }

  return WebhookLogConnectionSchema.parse(
    result.data.getWebhookLogs,
  ) as WebhookLogConnection;
}

// Game Config types
export interface GameConfig {
  maxPlayersPerRoom: number;
  playersPerRoomThreshold: number;
  resultsDisplayMs: number;
  questionDurationMs: number;
  freeTierDailyLimit: number;
  difficultyPoints: {
    easy: { correct: number; wrong: number };
    medium: { correct: number; wrong: number };
    hard: { correct: number; wrong: number };
  };
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  stripeTestMode: boolean;
  updatedAt: string;
  updatedBy?: string | null;
}

export interface UpdateGameConfigInput {
  maxPlayersPerRoom?: number;
  playersPerRoomThreshold?: number;
  resultsDisplayMs?: number;
  questionDurationMs?: number;
  freeTierDailyLimit?: number;
  difficultyPoints?: {
    easy: { correct: number; wrong: number };
    medium: { correct: number; wrong: number };
    hard: { correct: number; wrong: number };
  };
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  stripeTestMode?: boolean;
}

interface GetGameConfigResponse {
  data?: {
    getGameConfig?: GameConfig;
  };
}

/**
 * Get game configuration (admin only)
 */
export async function getGameConfig(): Promise<GameConfig | null> {
  const result = (await graphqlClient.graphql({
    query: GET_GAME_CONFIG,
  })) as GetGameConfigResponse;

  return result.data?.getGameConfig ?? null;
}

interface UpdateGameConfigResponse {
  data?: {
    updateGameConfig?: GameConfig;
  };
}

/**
 * Update game configuration (admin only)
 */
export async function updateGameConfig(
  input: UpdateGameConfigInput,
): Promise<GameConfig | null> {
  const result = (await graphqlClient.graphql({
    query: UPDATE_GAME_CONFIG,
    variables: { input },
  })) as UpdateGameConfigResponse;

  return result.data?.updateGameConfig ?? null;
}

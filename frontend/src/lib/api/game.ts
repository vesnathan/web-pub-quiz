/**
 * Game API functions
 * Wraps GraphQL operations with Zod validation
 */
import { graphqlClient } from "@/lib/graphql";
import { GET_GAME_STATE, GET_ABLY_TOKEN } from "@/graphql/queries";
import type { GameState, AblyTokenResponse } from "@quiz/shared";
import {
  GameStateSchema,
  AblyTokenResponseSchema,
} from "@/schemas/ValidationSchemas";

interface GetGameStateResponse {
  data?: {
    getGameState?: unknown;
  };
}

interface GetAblyTokenResponse {
  data?: {
    getAblyToken?: unknown;
  };
}

/**
 * Get the current game state
 */
export async function getGameState(): Promise<GameState | null> {
  const result = (await graphqlClient.graphql({
    query: GET_GAME_STATE,
  })) as GetGameStateResponse;

  if (!result.data?.getGameState) {
    return null;
  }

  return GameStateSchema.parse(result.data.getGameState) as GameState;
}

/**
 * Get an Ably token for real-time connections
 */
export async function getAblyToken(): Promise<AblyTokenResponse | null> {
  const result = (await graphqlClient.graphql({
    query: GET_ABLY_TOKEN,
  })) as GetAblyTokenResponse;

  if (!result.data?.getAblyToken) {
    return null;
  }

  return AblyTokenResponseSchema.parse(
    result.data.getAblyToken,
  ) as AblyTokenResponse;
}

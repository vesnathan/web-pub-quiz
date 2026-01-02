/**
 * Leaderboard API functions
 * Wraps GraphQL operations with Zod validation
 */
import { graphqlClient } from "@/lib/graphql";
import { GET_LEADERBOARD, GET_MY_RANK } from "@/graphql/queries";
import type { Leaderboard, LeaderboardType } from "@quiz/shared";
import { LeaderboardSchema } from "@/schemas/ValidationSchemas";
import { z } from "zod";

interface GetLeaderboardResponse {
  data?: {
    getLeaderboard?: unknown;
  };
}

interface GetMyRankResponse {
  data?: {
    getMyRank?: number | null;
  };
}

/**
 * Get leaderboard by type
 */
export async function getLeaderboard(
  type: LeaderboardType,
  limit?: number,
): Promise<Leaderboard | null> {
  const result = (await graphqlClient.graphql({
    query: GET_LEADERBOARD,
    variables: { type, limit },
  })) as GetLeaderboardResponse;

  if (!result.data?.getLeaderboard) {
    return null;
  }

  return LeaderboardSchema.parse(result.data.getLeaderboard) as Leaderboard;
}

/**
 * Get the current user's rank on a leaderboard
 */
export async function getMyRank(type: LeaderboardType): Promise<number | null> {
  const result = (await graphqlClient.graphql({
    query: GET_MY_RANK,
    variables: { type },
  })) as GetMyRankResponse;

  const rank = result.data?.getMyRank;
  return z.number().nullable().parse(rank);
}

import { util, Context } from "@aws-appsync/utils";
import { LeaderboardType } from "gqlTypes";

/**
 * GraphQL resolver: Query.getLeaderboard
 *
 * Fetches leaderboard entries for the specified type (DAILY, WEEKLY, ALL_TIME).
 *
 * @module resolvers/leaderboard/Queries
 */

type Args = {
  type: LeaderboardType;
  limit?: number;
};

/**
 * Prepares DynamoDB Query operation for leaderboard entries.
 *
 * @param ctx - AppSync context containing type and optional limit arguments
 * @returns DynamoDB Query request configuration
 */
export function request(ctx: Context<Args>) {
  const { type, limit } = ctx.arguments;
  const queryLimit = limit ?? 100;

  // Build the PK based on leaderboard type
  let pk: string;

  if (type === LeaderboardType.DAILY) {
    // Format: YYYY-MM-DD
    const today = util.time.nowFormatted("yyyy-MM-dd");
    pk = `LEADERBOARD#daily#${today}`;
  } else if (type === LeaderboardType.WEEKLY) {
    // Format: YYYY-'W'ww (e.g., 2024-W52)
    const week = util.time.nowFormatted("yyyy-'W'ww");
    pk = `LEADERBOARD#weekly#${week}`;
  } else {
    pk = "LEADERBOARD#alltime";
  }

  return {
    operation: "Query",
    query: {
      expression: "PK = :pk",
      expressionValues: util.dynamodb.toMapValues({
        ":pk": pk,
      }),
    },
    limit: queryLimit,
  };
}

/**
 * Processes DynamoDB response and returns the leaderboard.
 * Sorts entries by score descending and assigns rank numbers.
 *
 * @param ctx - AppSync context containing query result
 * @returns Leaderboard object with type, entries, and updatedAt
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items || [];

  // Sort by score descending using insertion sort (AppSync-compatible, only for...of allowed)
  const sorted: typeof items = [];
  for (const item of items) {
    let insertIndex = sorted.length; // Default: insert at end
    let checkIndex = 0;
    for (const existing of sorted) {
      if (item.score > existing.score) {
        insertIndex = checkIndex;
        break;
      }
      checkIndex = checkIndex + 1;
    }
    sorted.splice(insertIndex, 0, item);
  }

  // Assign ranks using for...of with manual counter
  const entries: Array<{
    rank: number;
    userId: string;
    displayName: string;
    score: number;
  }> = [];

  let rank = 1;
  for (const item of sorted) {
    const sk = item.SK || "";
    const userId = item.userId || sk.replace("USER#", "") || "";
    entries.push({
      rank: rank,
      userId: userId,
      displayName: item.displayName || "Unknown",
      score: item.score || 0,
    });
    rank = rank + 1;
  }

  return {
    type: ctx.arguments.type,
    entries,
    updatedAt: util.time.nowISO8601(),
  };
}

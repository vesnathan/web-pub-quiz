import { util, Context } from "@aws-appsync/utils";
import { LeaderboardType } from "gqlTypes";

/**
 * GraphQL resolver: Query.getMyRank
 *
 * Returns the current user's rank in the specified leaderboard.
 *
 * @module resolvers/leaderboard/Queries
 */

type Args = {
  type: LeaderboardType;
};

/**
 * Prepares DynamoDB Query operation to get all leaderboard entries.
 *
 * @param ctx - AppSync context containing type argument
 * @returns DynamoDB Query request configuration
 */
export function request(ctx: Context<Args>) {
  const { type } = ctx.arguments;

  // Get current user ID from Cognito identity
  const identity = ctx.identity as { sub?: string } | undefined;
  const userId = identity?.sub;
  if (!userId) {
    return util.error("Unauthorized", "UnauthorizedException");
  }

  // Store userId in stash for response function
  ctx.stash.userId = userId;

  // Build the PK based on leaderboard type
  let pk: string;

  if (type === LeaderboardType.DAILY) {
    const today = util.time.nowFormatted("yyyy-MM-dd");
    pk = `LEADERBOARD#daily#${today}`;
  } else if (type === LeaderboardType.WEEKLY) {
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
    limit: 1000, // Get all entries to calculate rank
  };
}

/**
 * Processes DynamoDB response and returns the user's rank.
 *
 * @param ctx - AppSync context containing query result
 * @returns The user's rank (1-indexed) or null if not found
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const userId = ctx.stash.userId;
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

  // Find the user's rank using for...of with manual counter
  let rank = 1;
  for (const item of sorted) {
    const sk = item.SK || "";
    const itemUserId = item.userId || sk.replace("USER#", "") || "";
    if (itemUserId === userId) {
      return rank;
    }
    rank = rank + 1;
  }

  // User not found in leaderboard
  return null;
}

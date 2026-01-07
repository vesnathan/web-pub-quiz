import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getGameConfig
 *
 * Retrieves game configuration for admin users.
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/admin/Queries
 */

/**
 * Request function - gets game config from DynamoDB.
 */
export function request(ctx: Context) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can view game config",
      "UnauthorizedException"
    );
  }

  return {
    operation: "GetItem",
    key: util.dynamodb.toMapValues({
      PK: "CONFIG#game",
      SK: "SETTINGS",
    }),
  };
}

/**
 * Response function - transforms DynamoDB item to GameConfig type.
 */
export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const item = ctx.result;

  // Return default config if none exists
  if (!item) {
    return {
      maxPlayersPerRoom: 20,
      playersPerRoomThreshold: 20,
      resultsDisplayMs: 5000,
      questionDurationMs: 10000,
      freeTierDailyLimit: 50,
      difficultyPoints: {
        easy: { correct: 50, wrong: -200 },
        medium: { correct: 75, wrong: -100 },
        hard: { correct: 100, wrong: -50 },
      },
      maintenanceMode: false,
      maintenanceMessage: null,
      updatedAt: util.time.nowISO8601(),
      updatedBy: null,
    };
  }

  return {
    maxPlayersPerRoom: item.maxPlayersPerRoom || 20,
    playersPerRoomThreshold: item.playersPerRoomThreshold || 20,
    resultsDisplayMs: item.resultsDisplayMs || 5000,
    questionDurationMs: item.questionDurationMs || 10000,
    freeTierDailyLimit: item.freeTierDailyLimit || 50,
    difficultyPoints: item.difficultyPoints || {
      easy: { correct: 50, wrong: -200 },
      medium: { correct: 75, wrong: -100 },
      hard: { correct: 100, wrong: -50 },
    },
    maintenanceMode: item.maintenanceMode || false,
    maintenanceMessage: item.maintenanceMessage || null,
    updatedAt: item.updatedAt || util.time.nowISO8601(),
    updatedBy: item.updatedBy || null,
  };
}

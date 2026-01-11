import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getUserModeration
 *
 * Gets moderation status for a user (strikes, ban status).
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/moderation/Queries
 */

type Args = {
  userId: string;
};

/**
 * Request function - queries user's moderation record from DynamoDB.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can view moderation status",
      "UnauthorizedException",
    );
  }

  const { userId } = ctx.arguments;
  ctx.stash.userId = userId;

  // Query both PROFILE and MODERATION records
  return {
    operation: "Query",
    query: {
      expression: "PK = :pk",
      expressionValues: util.dynamodb.toMapValues({
        ":pk": `USER#${userId}`,
      }),
    },
    filter: {
      expression: "SK = :profile OR SK = :moderation",
      expressionValues: util.dynamodb.toMapValues({
        ":profile": "PROFILE",
        ":moderation": "MODERATION",
      }),
    },
  };
}

/**
 * Response function - combines user profile and moderation data.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const userId = ctx.stash.userId;
  const items = ctx.result.items || [];

  let displayName = "Unknown User";
  let moderation: {
    strikes?: Array<{
      id: string;
      reason: string;
      relatedReportId?: string;
      issuedBy: string;
      issuedAt: string;
      expiresAt?: string;
    }>;
    isBanned?: boolean;
    bannedAt?: string;
    bannedReason?: string;
    bannedBy?: string;
  } = {};

  for (const item of items) {
    if (item.SK === "PROFILE") {
      displayName = item.displayName || "Unknown User";
    } else if (item.SK === "MODERATION") {
      moderation = {
        strikes: item.strikes || [],
        isBanned: item.isBanned || false,
        bannedAt: item.bannedAt,
        bannedReason: item.bannedReason,
        bannedBy: item.bannedBy,
      };
    }
  }

  // Filter out expired strikes
  const now = util.time.nowISO8601();
  const activeStrikes: Array<{
    id: string;
    reason: string;
    relatedReportId: string | null;
    issuedBy: string;
    issuedAt: string;
    expiresAt: string | null;
  }> = [];

  if (moderation.strikes) {
    for (const strike of moderation.strikes) {
      if (!strike.expiresAt || strike.expiresAt > now) {
        activeStrikes.push({
          id: strike.id,
          reason: strike.reason,
          relatedReportId: strike.relatedReportId || null,
          issuedBy: strike.issuedBy,
          issuedAt: strike.issuedAt,
          expiresAt: strike.expiresAt || null,
        });
      }
    }
  }

  return {
    userId: userId,
    displayName: displayName,
    strikes: activeStrikes,
    strikeCount: activeStrikes.length,
    isBanned: moderation.isBanned || false,
    bannedAt: moderation.bannedAt || null,
    bannedReason: moderation.bannedReason || null,
    bannedBy: moderation.bannedBy || null,
  };
}

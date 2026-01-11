import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.unbanUser
 *
 * Removes ban from a user.
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/moderation/Mutations
 */

type Args = {
  userId: string;
};

/**
 * Request function - removes ban status from user's moderation record.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can unban users",
      "UnauthorizedException",
    );
  }

  const { userId } = ctx.arguments;
  const now = util.time.nowISO8601();

  ctx.stash.userId = userId;

  return {
    operation: "UpdateItem",
    key: util.dynamodb.toMapValues({
      PK: `USER#${userId}`,
      SK: "MODERATION",
    }),
    update: {
      expression:
        "SET isBanned = :banned, unbannedAt = :now, updatedAt = :now REMOVE bannedAt, bannedReason, bannedBy",
      expressionValues: util.dynamodb.toMapValues({
        ":banned": false,
        ":now": now,
      }),
    },
  };
}

/**
 * Response function - returns updated moderation status.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const userId = ctx.stash.userId;
  const item = ctx.result;

  // Filter active strikes
  const strikes = item?.strikes || [];
  const now = util.time.nowISO8601();
  const activeStrikes: Array<{
    id: string;
    reason: string;
    relatedReportId: string | null;
    issuedBy: string;
    issuedAt: string;
    expiresAt: string | null;
  }> = [];

  for (const strike of strikes) {
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

  return {
    success: true,
    message: "User has been unbanned.",
    moderation: {
      userId: userId,
      displayName: "Unknown",
      strikes: activeStrikes,
      strikeCount: activeStrikes.length,
      isBanned: false,
      bannedAt: null,
      bannedReason: null,
      bannedBy: null,
    },
  };
}

import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.banUser
 *
 * Bans a user immediately.
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/moderation/Mutations
 */

type BanUserInput = {
  userId: string;
  reason: string;
  relatedReportId?: string;
  deleteAccount?: boolean;
};

type Args = {
  input: BanUserInput;
};

/**
 * Request function - sets ban status on user's moderation record.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can ban users",
      "UnauthorizedException",
    );
  }

  const { input } = ctx.arguments;
  const { userId, reason, relatedReportId } = input;

  const now = util.time.nowISO8601();

  // Store in stash for response
  ctx.stash.userId = userId;
  ctx.stash.deleteAccount = input.deleteAccount || false;

  return {
    operation: "UpdateItem",
    key: util.dynamodb.toMapValues({
      PK: `USER#${userId}`,
      SK: "MODERATION",
    }),
    update: {
      expression:
        "SET isBanned = :banned, bannedAt = :now, bannedReason = :reason, bannedBy = :adminId, relatedReportId = :reportId, updatedAt = :now",
      expressionValues: util.dynamodb.toMapValues({
        ":banned": true,
        ":now": now,
        ":reason": reason,
        ":adminId": identity.sub,
        ":reportId": relatedReportId || null,
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
  const deleteAccount = ctx.stash.deleteAccount;
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
    message: deleteAccount
      ? "User has been banned and flagged for account deletion."
      : "User has been banned.",
    moderation: {
      userId: userId,
      displayName: "Unknown",
      strikes: activeStrikes,
      strikeCount: activeStrikes.length,
      isBanned: true,
      bannedAt: item?.bannedAt || null,
      bannedReason: item?.bannedReason || null,
      bannedBy: item?.bannedBy || null,
    },
  };
}

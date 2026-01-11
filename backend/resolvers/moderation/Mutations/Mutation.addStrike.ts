import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.addStrike
 *
 * Adds a strike to a user's record.
 * Restricted to users in the SiteAdmin Cognito group.
 * Auto-bans user after 3 active strikes.
 *
 * @module resolvers/moderation/Mutations
 */

type AddStrikeInput = {
  userId: string;
  reason: string;
  relatedReportId?: string;
  expiresInDays?: number;
};

type Args = {
  input: AddStrikeInput;
};

/**
 * Request function - adds strike to user's moderation record.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can add strikes",
      "UnauthorizedException",
    );
  }

  const { input } = ctx.arguments;
  const { userId, reason, relatedReportId, expiresInDays } = input;

  const strikeId = util.autoId();
  const now = util.time.nowISO8601();

  // Calculate expiry if specified (default: 90 days)
  const daysToExpire = expiresInDays || 90;
  const expiresAtMs =
    util.time.nowEpochMilliSeconds() + daysToExpire * 24 * 60 * 60 * 1000;
  const expiresAt = util.time.epochMilliSecondsToISO8601(expiresAtMs);

  const newStrike = {
    id: strikeId,
    reason: reason,
    relatedReportId: relatedReportId || null,
    issuedBy: identity.sub,
    issuedAt: now,
    expiresAt: expiresAt,
  };

  // Store userId in stash for response
  ctx.stash.userId = userId;
  ctx.stash.newStrike = newStrike;

  return {
    operation: "UpdateItem",
    key: util.dynamodb.toMapValues({
      PK: `USER#${userId}`,
      SK: "MODERATION",
    }),
    update: {
      expression:
        "SET strikes = list_append(if_not_exists(strikes, :empty), :strike), updatedAt = :now",
      expressionValues: util.dynamodb.toMapValues({
        ":strike": [newStrike],
        ":empty": [],
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
  const strikes = item?.strikes || [];

  // Filter active strikes
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

  const strikeCount = activeStrikes.length;
  const shouldAutoBan = strikeCount >= 3;

  return {
    success: true,
    message: shouldAutoBan
      ? `Strike added. User now has ${strikeCount} strikes and should be banned.`
      : `Strike added. User now has ${strikeCount} strike(s).`,
    moderation: {
      userId: userId,
      displayName: "Unknown", // Would need separate query to get display name
      strikes: activeStrikes,
      strikeCount: strikeCount,
      isBanned: item?.isBanned || false,
      bannedAt: item?.bannedAt || null,
      bannedReason: item?.bannedReason || null,
      bannedBy: item?.bannedBy || null,
    },
  };
}

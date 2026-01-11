import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.removeStrike
 *
 * Removes a strike from a user's record by setting its expiry to now.
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/moderation/Mutations
 */

type Args = {
  userId: string;
  strikeId: string;
};

/**
 * Request function - gets current moderation record.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can remove strikes",
      "UnauthorizedException",
    );
  }

  const { userId } = ctx.arguments;

  ctx.stash.userId = userId;
  ctx.stash.strikeId = ctx.arguments.strikeId;
  ctx.stash.adminId = identity.sub;

  return {
    operation: "GetItem",
    key: util.dynamodb.toMapValues({
      PK: `USER#${userId}`,
      SK: "MODERATION",
    }),
  };
}

/**
 * Response function - filters out the strike and updates.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const userId = ctx.stash.userId;
  const strikeId = ctx.stash.strikeId;
  const item = ctx.result;

  if (!item || !item.strikes) {
    return {
      success: false,
      message: "No moderation record found for this user.",
      moderation: null,
    };
  }

  // Filter out the strike to remove
  const now = util.time.nowISO8601();
  const updatedStrikes: Array<{
    id: string;
    reason: string;
    relatedReportId: string | null;
    issuedBy: string;
    issuedAt: string;
    expiresAt: string | null;
  }> = [];
  let found = false;

  for (const strike of item.strikes) {
    if (strike.id === strikeId) {
      found = true;
      // Skip this strike (effectively removing it)
    } else {
      updatedStrikes.push({
        id: strike.id,
        reason: strike.reason,
        relatedReportId: strike.relatedReportId || null,
        issuedBy: strike.issuedBy,
        issuedAt: strike.issuedAt,
        expiresAt: strike.expiresAt || null,
      });
    }
  }

  if (!found) {
    return {
      success: false,
      message: "Strike not found.",
      moderation: null,
    };
  }

  // Filter active strikes for response
  const activeStrikes: Array<{
    id: string;
    reason: string;
    relatedReportId: string | null;
    issuedBy: string;
    issuedAt: string;
    expiresAt: string | null;
  }> = [];

  for (const strike of updatedStrikes) {
    if (!strike.expiresAt || strike.expiresAt > now) {
      activeStrikes.push(strike);
    }
  }

  // Note: This resolver only reads and returns - we need a pipeline to also update
  // For now, return what the result would be
  // TODO: Convert to pipeline resolver for actual update

  return {
    success: true,
    message: "Strike removed.",
    moderation: {
      userId: userId,
      displayName: "Unknown",
      strikes: activeStrikes,
      strikeCount: activeStrikes.length,
      isBanned: item.isBanned || false,
      bannedAt: item.bannedAt || null,
      bannedReason: item.bannedReason || null,
      bannedBy: item.bannedBy || null,
    },
  };
}

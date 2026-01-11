import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getMyProfile
 *
 * Fetches the authenticated user's profile from DynamoDB.
 * Also checks if user is banned.
 *
 * @module resolvers/users/Queries
 */

type Identity = {
  sub: string;
};

/**
 * Prepares DynamoDB Query operation for the user's profile and moderation status.
 *
 * @param ctx - AppSync context containing user identity
 * @returns DynamoDB Query request configuration
 */
export function request(ctx: Context) {
  const identity = ctx.identity as Identity;

  return {
    operation: "Query",
    query: {
      expression: "PK = :pk",
      expressionValues: util.dynamodb.toMapValues({
        ":pk": `USER#${identity.sub}`,
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
 * Processes DynamoDB response and returns the user profile.
 * Returns error if user is banned.
 *
 * @param ctx - AppSync context containing DynamoDB result
 * @returns User profile or null if not found
 */
export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items || [];

  let profile = null;
  let moderation = null;

  for (const item of items) {
    if (item.SK === "PROFILE") {
      profile = item;
    } else if (item.SK === "MODERATION") {
      moderation = item;
    }
  }

  // Check if user is banned - include reason in error message for frontend
  if (moderation && moderation.isBanned) {
    const reason = moderation.bannedReason || "Policy violation";
    return util.error(`BANNED:${reason}`, "AccountBannedException");
  }

  if (!profile) {
    return null;
  }

  // Calculate total skill points from badges
  const badges = profile.badges || [];
  let totalSkillPoints = 0;
  for (const badge of badges) {
    totalSkillPoints += badge.skillPoints || 0;
  }

  // Build moderation status for non-banned users
  let moderationStatus = null;
  if (moderation) {
    const strikes = moderation.strikes || [];
    const now = util.time.nowISO8601();

    // Filter out expired strikes and map to user-facing format
    const activeStrikes: { reason: string; issuedAt: string }[] = [];
    for (const strike of strikes) {
      if (!strike.expiresAt || strike.expiresAt > now) {
        activeStrikes.push({
          reason: strike.reason,
          issuedAt: strike.issuedAt,
        });
      }
    }

    moderationStatus = {
      strikeCount: activeStrikes.length,
      strikes: activeStrikes,
      isBanned: false,
      bannedReason: null,
    };
  }

  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    createdAt: profile.createdAt,
    stats: profile.stats,
    subscription: profile.subscription,
    badges: badges,
    totalSkillPoints: totalSkillPoints,
    tipUnlockedUntil: profile.tipUnlockedUntil,
    moderation: moderationStatus,
  };
}

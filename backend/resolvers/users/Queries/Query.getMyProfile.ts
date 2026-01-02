import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getMyProfile
 *
 * Fetches the authenticated user's profile from DynamoDB.
 *
 * @module resolvers/users/Queries
 */

type Identity = {
  sub: string;
};

/**
 * Prepares DynamoDB GetItem operation for the user's profile.
 *
 * @param ctx - AppSync context containing user identity
 * @returns DynamoDB GetItem request configuration
 */
export function request(ctx: Context) {
  const identity = ctx.identity as Identity;

  return {
    operation: "GetItem",
    key: util.dynamodb.toMapValues({
      PK: `USER#${identity.sub}`,
      SK: "PROFILE",
    }),
  };
}

/**
 * Processes DynamoDB response and returns the user profile.
 *
 * @param ctx - AppSync context containing DynamoDB result
 * @returns User profile or null if not found
 */
export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  if (!ctx.result) {
    return null;
  }

  // Calculate total skill points from badges
  const badges = ctx.result.badges || [];
  let totalSkillPoints = 0;
  for (const badge of badges) {
    totalSkillPoints += badge.skillPoints || 0;
  }

  return {
    ...ctx.result,
    badges: badges,
    totalSkillPoints: totalSkillPoints,
  };
}

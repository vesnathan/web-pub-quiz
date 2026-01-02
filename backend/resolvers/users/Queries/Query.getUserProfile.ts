import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getUserProfile
 *
 * Fetches a public user profile by userId from DynamoDB.
 *
 * @module resolvers/users/Queries
 */

type Args = {
  userId: string;
};

/**
 * Prepares DynamoDB GetItem operation for a user's profile.
 *
 * @param ctx - AppSync context containing userId argument
 * @returns DynamoDB GetItem request configuration
 */
export function request(ctx: Context<Args>) {
  const { userId } = ctx.arguments;

  return {
    operation: "GetItem",
    key: util.dynamodb.toMapValues({
      PK: `USER#${userId}`,
      SK: "PROFILE",
    }),
  };
}

/**
 * Processes DynamoDB response and returns public user profile fields.
 *
 * @param ctx - AppSync context containing DynamoDB result
 * @returns Public user profile or null if not found
 */
export function response(ctx: Context<Args>) {
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

  // Return only public fields
  return {
    id: ctx.result.id,
    displayName: ctx.result.displayName,
    stats: ctx.result.stats,
    badges: badges,
    totalSkillPoints: totalSkillPoints,
  };
}

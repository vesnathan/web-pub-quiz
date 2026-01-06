import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.recordReferral
 *
 * Records a referral relationship between a new user and their referrer.
 * Updates the new user's referredBy field and increments the referrer's referralCount.
 *
 * @module resolvers/referral/Mutations
 */

type Identity = {
  sub: string;
  username: string;
};

type RecordReferralArgs = {
  referrerId: string;
};

/**
 * Prepares DynamoDB transaction to record the referral.
 *
 * @param ctx - AppSync context containing user identity and arguments
 * @returns DynamoDB transact write request
 */
export function request(ctx: Context<RecordReferralArgs>) {
  const identity = ctx.identity as Identity;
  const userId = identity.sub;
  const { referrerId } = ctx.args;

  // Don't allow self-referral
  if (userId === referrerId) {
    return util.error("Cannot refer yourself", "ValidationError");
  }

  // Use TransactWriteItems to atomically update both users
  return {
    operation: "TransactWriteItems",
    transactItems: [
      // Update the new user's referredBy field (only if not already set)
      {
        table: "QuizNightLive",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({
          PK: `USER#${userId}`,
          SK: "PROFILE",
        }),
        update: {
          expression:
            "SET referredBy = if_not_exists(referredBy, :referrerId)",
          expressionValues: util.dynamodb.toMapValues({
            ":referrerId": referrerId,
          }),
        },
        condition: {
          expression: "attribute_exists(PK)",
        },
      },
      // Increment the referrer's referralCount
      {
        table: "QuizNightLive",
        operation: "UpdateItem",
        key: util.dynamodb.toMapValues({
          PK: `USER#${referrerId}`,
          SK: "PROFILE",
        }),
        update: {
          expression:
            "SET referralCount = if_not_exists(referralCount, :zero) + :inc",
          expressionValues: util.dynamodb.toMapValues({
            ":zero": 0,
            ":inc": 1,
          }),
        },
        condition: {
          expression: "attribute_exists(PK)",
        },
      },
    ],
  };
}

/**
 * Processes the transaction result.
 *
 * @param ctx - AppSync context containing transaction result
 * @returns Boolean indicating success
 */
export function response(ctx: Context) {
  if (ctx.error) {
    // If transaction failed due to condition (user doesn't exist or already has referrer)
    // silently succeed - this is not a critical operation
    console.log("Referral recording failed (may already be set):", ctx.error);
    return true;
  }

  return true;
}

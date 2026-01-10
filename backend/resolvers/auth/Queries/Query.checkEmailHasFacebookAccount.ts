import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.checkEmailHasFacebookAccount
 *
 * Invokes Lambda to check if an email is registered with Facebook.
 *
 * @module resolvers/auth/Queries
 */

interface CheckEmailArgs {
  email: string;
}

/**
 * Prepares Lambda invocation payload.
 *
 * @param ctx - AppSync context containing query arguments
 * @returns Lambda invoke request configuration
 */
export function request(ctx: Context<CheckEmailArgs>) {
  return {
    operation: "Invoke",
    payload: {
      arguments: ctx.arguments,
    },
  };
}

/**
 * Processes Lambda response.
 *
 * @param ctx - AppSync context containing Lambda result
 * @returns Boolean indicating if email has Facebook account
 */
export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}

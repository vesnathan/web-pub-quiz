import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.reportUser
 *
 * Invokes Lambda to process user report submission.
 * Requires authenticated user (Cognito).
 *
 * @module resolvers/report/Mutations
 */

type Identity = {
  sub: string;
  username: string;
  claims: {
    "custom:displayName"?: string;
    name?: string;
    email?: string;
  };
};

type ReportUserInput = {
  reportedUserId: string;
  reason: string;
  context: string;
  messageContent?: string;
  messageId?: string;
};

type Args = {
  input: ReportUserInput;
};

/**
 * Prepares Lambda invocation payload for reporting a user.
 *
 * @param ctx - AppSync context containing arguments and identity
 * @returns Lambda invoke request configuration
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as Identity;

  // Prevent self-reporting
  if (ctx.args.input.reportedUserId === identity.sub) {
    return util.error("You cannot report yourself", "ValidationError");
  }

  return {
    operation: "Invoke",
    payload: {
      arguments: ctx.args,
      identity: {
        sub: identity.sub,
        displayName:
          identity.claims["custom:displayName"] ||
          identity.claims.name ||
          identity.username,
      },
    },
  };
}

/**
 * Processes Lambda response.
 *
 * @param ctx - AppSync context containing Lambda result
 * @returns ReportUserResult
 */
export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result?.errorMessage) {
    return util.error(ctx.result.errorMessage, "ReportError");
  }
  return ctx.result;
}

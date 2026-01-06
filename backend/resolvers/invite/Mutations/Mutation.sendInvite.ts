import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.sendInvite
 *
 * Invokes Lambda to send an invite email to a friend.
 * Includes reCAPTCHA verification and rate limiting.
 *
 * @module resolvers/invite/Mutations
 */

type Identity = {
  sub: string;
  username: string;
};

type SendInviteArgs = {
  friendName: string;
  email: string;
  recaptchaToken: string;
};

/**
 * Prepares Lambda invocation payload for sending invite.
 *
 * @param ctx - AppSync context containing user identity and arguments
 * @returns Lambda invoke request configuration
 */
export function request(ctx: Context<SendInviteArgs>) {
  const identity = ctx.identity as Identity;

  return {
    operation: "Invoke",
    payload: {
      arguments: ctx.args,
      identity: {
        sub: identity.sub,
        username: identity.username,
      },
    },
  };
}

/**
 * Processes Lambda response.
 *
 * @param ctx - AppSync context containing Lambda result
 * @returns Boolean indicating success
 */
export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }
  if (ctx.result?.errorMessage) {
    return util.error(ctx.result.errorMessage, "InviteError");
  }
  return ctx.result;
}

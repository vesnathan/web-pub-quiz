import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.sendContact
 *
 * Invokes Lambda to send a contact form submission.
 * Uses reCAPTCHA verification and rate limiting (no authentication required).
 *
 * @module resolvers/contact/Mutations
 */

type SendContactArgs = {
  name: string;
  email: string;
  subject: string;
  message: string;
  recaptchaToken: string;
};

/**
 * Prepares Lambda invocation payload for sending contact form.
 *
 * @param ctx - AppSync context containing arguments
 * @returns Lambda invoke request configuration
 */
export function request(ctx: Context<SendContactArgs>) {
  return {
    operation: "Invoke",
    payload: {
      arguments: ctx.args,
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
    return util.error(ctx.result.errorMessage, "ContactError");
  }
  return ctx.result;
}

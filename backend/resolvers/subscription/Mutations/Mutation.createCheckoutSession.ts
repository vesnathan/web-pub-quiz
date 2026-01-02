import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.createCheckoutSession
 *
 * Creates a checkout session for subscription payment via Stripe or PayPal.
 *
 * @module resolvers/subscription/Mutations
 */

type CreateCheckoutInput = {
  tier: number;
  provider: "stripe" | "paypal";
  successUrl: string;
  cancelUrl: string;
};

type Args = {
  input: CreateCheckoutInput;
};

type Identity = {
  sub: string;
};

/**
 * Prepares Lambda invocation payload for checkout session creation.
 *
 * @param ctx - AppSync context containing arguments and user identity
 * @returns Lambda invoke request configuration
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as Identity;

  if (!identity?.sub) {
    return util.error("Unauthorized: No user ID found", "UnauthorizedException");
  }

  const { tier, provider, successUrl, cancelUrl } = ctx.arguments.input;

  // Validate tier
  if (tier !== 1 && tier !== 2) {
    return util.error(
      "Invalid tier. Must be 1 (Supporter) or 2 (Champion)",
      "ValidationException"
    );
  }

  // Validate provider
  if (provider !== "stripe" && provider !== "paypal") {
    return util.error(
      "Invalid provider. Must be stripe or paypal",
      "ValidationException"
    );
  }

  return {
    operation: "Invoke",
    payload: {
      userId: identity.sub,
      tier,
      provider,
      successUrl,
      cancelUrl,
    },
  };
}

/**
 * Processes Lambda response and returns the checkout session.
 *
 * @param ctx - AppSync context containing Lambda result
 * @returns Checkout session with URL
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}

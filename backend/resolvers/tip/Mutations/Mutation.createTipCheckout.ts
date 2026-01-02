import { util, Context } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.createTipCheckout
 *
 * Creates a one-time tip checkout session for 24hr unlimited sets.
 *
 * @module resolvers/tip/Mutations
 */

type Args = {
  provider: "stripe" | "paypal";
};

type Identity = {
  sub: string;
};

/**
 * Prepares Lambda invocation payload for tip checkout creation.
 *
 * @param ctx - AppSync context containing arguments and user identity
 * @returns Lambda invoke request configuration
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as Identity;

  if (!identity?.sub) {
    return util.error("Unauthorized: No user ID found", "UnauthorizedException");
  }

  const { provider } = ctx.arguments;

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
      provider,
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

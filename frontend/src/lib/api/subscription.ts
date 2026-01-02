/**
 * Subscription API functions
 * Wraps GraphQL operations with Zod validation
 */
import { graphqlClient } from "@/lib/graphql";
import {
  CREATE_CHECKOUT_SESSION,
  CREATE_TIP_CHECKOUT,
  MARK_GIFT_NOTIFICATION_SEEN,
} from "@/graphql/mutations";
import type {
  CheckoutSession,
  CreateCheckoutInput,
  SubscriptionProvider,
} from "@quiz/shared";
import { CheckoutSessionSchema } from "@/schemas/ValidationSchemas";

interface CreateCheckoutResponse {
  data?: {
    createCheckoutSession?: unknown;
  };
}

interface MarkGiftNotificationSeenResponse {
  data?: {
    markGiftNotificationSeen?: boolean;
  };
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<CheckoutSession | null> {
  const result = (await graphqlClient.graphql({
    query: CREATE_CHECKOUT_SESSION,
    variables: { input },
  })) as CreateCheckoutResponse;

  if (!result.data?.createCheckoutSession) {
    return null;
  }

  return CheckoutSessionSchema.parse(
    result.data.createCheckoutSession,
  ) as CheckoutSession;
}

/**
 * Mark gift notification as seen
 */
export async function markGiftNotificationSeen(): Promise<boolean> {
  const result = (await graphqlClient.graphql({
    query: MARK_GIFT_NOTIFICATION_SEEN,
  })) as MarkGiftNotificationSeenResponse;

  return result.data?.markGiftNotificationSeen ?? false;
}

interface CreateTipCheckoutResponse {
  data?: {
    createTipCheckout?: unknown;
  };
}

/**
 * Create a tip checkout session ($2 one-time payment)
 */
export async function createTipCheckout(
  provider: SubscriptionProvider,
): Promise<CheckoutSession | null> {
  const result = (await graphqlClient.graphql({
    query: CREATE_TIP_CHECKOUT,
    variables: { provider },
  })) as CreateTipCheckoutResponse;

  if (!result.data?.createTipCheckout) {
    return null;
  }

  return CheckoutSessionSchema.parse(
    result.data.createTipCheckout,
  ) as CheckoutSession;
}

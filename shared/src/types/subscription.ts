/**
 * Subscription tier levels
 * 0 = Free, 1 = Supporter ($3/mo), 2 = Champion ($10/mo)
 */
export type SubscriptionTier = 0 | 1 | 2;

export const SUBSCRIPTION_TIERS = {
  FREE: 0 as SubscriptionTier,
  SUPPORTER: 1 as SubscriptionTier,
  CHAMPION: 2 as SubscriptionTier,
} as const;

export const SUBSCRIPTION_TIER_NAMES: Record<SubscriptionTier, string> = {
  0: 'Free',
  1: 'Supporter',
  2: 'Champion',
};

export const SUBSCRIPTION_TIER_PRICES: Record<SubscriptionTier, number> = {
  0: 0,
  1: 300, // $3.00 in cents
  2: 1000, // $10.00 in cents
};

export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing' | null;

export type SubscriptionProvider = 'stripe' | 'paypal' | null;

/**
 * Subscription info stored on user profile
 */
export interface SubscriptionInfo {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  provider: SubscriptionProvider;
  subscriptionId: string | null; // Provider's subscription ID
  customerId: string | null; // Provider's customer ID
  startedAt: string | null; // ISO timestamp
  expiresAt: string | null; // ISO timestamp (for cancelled subscriptions)
  cancelledAt: string | null; // ISO timestamp
}

/**
 * Default subscription info for free users
 */
export const DEFAULT_SUBSCRIPTION_INFO: SubscriptionInfo = {
  tier: 0,
  status: null,
  provider: null,
  subscriptionId: null,
  customerId: null,
  startedAt: null,
  expiresAt: null,
  cancelledAt: null,
};

/**
 * Feature flags based on subscription tier
 */
export interface SubscriptionFeatures {
  unlimitedSets: boolean;
  adFree: boolean;
  patronBadge: boolean;
  patronLeaderboard: boolean;
  privateRooms: boolean;
  customQuizzes: boolean;
  creditsPage: boolean;
}

/**
 * Get features available for a subscription tier
 */
export function getSubscriptionFeatures(tier: SubscriptionTier): SubscriptionFeatures {
  return {
    unlimitedSets: tier >= 1,
    adFree: tier >= 2,
    patronBadge: tier >= 1,
    patronLeaderboard: tier >= 1,
    privateRooms: tier >= 2,
    customQuizzes: tier >= 2,
    creditsPage: tier >= 2,
  };
}

/**
 * Free tier daily set limit
 */
export const FREE_TIER_DAILY_SET_LIMIT = 3;

/**
 * Stripe webhook event types we handle
 */
export type StripeWebhookEvent =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_succeeded'
  | 'invoice.payment_failed';

/**
 * PayPal webhook event types we handle
 */
export type PayPalWebhookEvent =
  | 'BILLING.SUBSCRIPTION.CREATED'
  | 'BILLING.SUBSCRIPTION.ACTIVATED'
  | 'BILLING.SUBSCRIPTION.UPDATED'
  | 'BILLING.SUBSCRIPTION.CANCELLED'
  | 'BILLING.SUBSCRIPTION.SUSPENDED'
  | 'PAYMENT.SALE.COMPLETED';

/**
 * Checkout session request
 */
export interface CreateCheckoutRequest {
  tier: SubscriptionTier;
  provider: 'stripe' | 'paypal';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Checkout session response
 */
export interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

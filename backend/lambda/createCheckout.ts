import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { SubscriptionTier } from "@quiz/shared";
import {
  SUBSCRIPTION_TIER_PRICES,
  SUBSCRIPTION_TIER_NAMES,
  GAME_CONFIG_PK,
  GAME_CONFIG_SK,
} from "@quiz/shared";

const STRIPE_SECRETS_ARN = process.env.STRIPE_SECRETS_ARN;
const STRIPE_TEST_SECRETS_ARN = process.env.STRIPE_TEST_SECRETS_ARN;
const PAYPAL_SECRETS_ARN = process.env.PAYPAL_SECRETS_ARN;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || "https://api-m.paypal.com";
const TABLE_NAME = process.env.TABLE_NAME!;

const secretsClient = new SecretsManagerClient({});
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

// Cache secrets (keyed by ARN)
const secretsCache: Record<string, StripeSecrets> = {};
let paypalSecrets: PayPalSecrets | null = null;
let cachedStripeTestMode: boolean | null = null;
let stripeTestModeCacheTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute cache for test mode setting

interface StripeSecrets {
  secretKey: string;
  publishableKey: string;
  webhookSecret: string;
  priceIdSupporter: string;
  priceIdChampion: string;
}

interface PayPalSecrets {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  planIdSupporter: string;
  planIdChampion: string;
}

interface CreateCheckoutEvent {
  userId: string;
  tier: SubscriptionTier;
  provider: "stripe" | "paypal";
  successUrl: string;
  cancelUrl: string;
}

interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId?: string;
}

async function isStripeTestMode(): Promise<boolean> {
  const now = Date.now();
  if (
    cachedStripeTestMode !== null &&
    now - stripeTestModeCacheTime < CACHE_TTL_MS
  ) {
    return cachedStripeTestMode;
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: GAME_CONFIG_PK, SK: GAME_CONFIG_SK },
      }),
    );

    cachedStripeTestMode = result.Item?.stripeTestMode ?? false;
    stripeTestModeCacheTime = now;
    return cachedStripeTestMode;
  } catch (error) {
    console.error(
      "Failed to read game config, defaulting to production mode:",
      error,
    );
    return false;
  }
}

async function getStripeSecrets(): Promise<StripeSecrets> {
  const testMode = await isStripeTestMode();
  const secretArn = testMode ? STRIPE_TEST_SECRETS_ARN : STRIPE_SECRETS_ARN;

  if (!secretArn) {
    throw new Error(
      testMode
        ? "STRIPE_TEST_SECRETS_ARN not configured"
        : "STRIPE_SECRETS_ARN not configured",
    );
  }

  // Check cache
  if (secretsCache[secretArn]) {
    return secretsCache[secretArn];
  }

  console.log(`Using Stripe ${testMode ? "TEST" : "PRODUCTION"} mode`);

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretArn }),
  );

  if (!response.SecretString) {
    throw new Error("Stripe secrets not found");
  }

  secretsCache[secretArn] = JSON.parse(response.SecretString);
  return secretsCache[secretArn];
}

async function getPayPalSecrets(): Promise<PayPalSecrets> {
  if (paypalSecrets) return paypalSecrets;

  if (!PAYPAL_SECRETS_ARN) {
    throw new Error("PAYPAL_SECRETS_ARN not configured");
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: PAYPAL_SECRETS_ARN }),
  );

  if (!response.SecretString) {
    throw new Error("PayPal secrets not found");
  }

  paypalSecrets = JSON.parse(response.SecretString);
  return paypalSecrets!;
}

async function createStripeCheckout(
  event: CreateCheckoutEvent,
  secrets: StripeSecrets,
): Promise<CreateCheckoutResponse> {
  // Get the price ID for the tier
  let priceId: string;
  if (event.tier === 1) {
    priceId = secrets.priceIdSupporter;
  } else if (event.tier === 2) {
    priceId = secrets.priceIdChampion;
  } else {
    throw new Error(`Invalid tier: ${event.tier}`);
  }

  // Create Stripe Checkout Session via API
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secrets.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: event.successUrl,
      cancel_url: event.cancelUrl,
      "metadata[userId]": event.userId,
      "metadata[tier]": event.tier.toString(),
      "subscription_data[metadata][userId]": event.userId,
      "subscription_data[metadata][tier]": event.tier.toString(),
      "subscription_data[description]": "App Builder Studio - QuizNight.live",
      allow_promotion_codes: "true",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Stripe API error:", error);
    throw new Error("Failed to create Stripe checkout session");
  }

  const session = await response.json();

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

async function getPayPalAccessToken(secrets: PayPalSecrets): Promise<string> {
  const auth = Buffer.from(
    `${secrets.clientId}:${secrets.clientSecret}`,
  ).toString("base64");

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function createPayPalCheckout(
  event: CreateCheckoutEvent,
  secrets: PayPalSecrets,
): Promise<CreateCheckoutResponse> {
  // Get the plan ID for the tier
  let planId: string;
  if (event.tier === 1) {
    planId = secrets.planIdSupporter;
  } else if (event.tier === 2) {
    planId = secrets.planIdChampion;
  } else {
    throw new Error(`Invalid tier: ${event.tier}`);
  }

  const accessToken = await getPayPalAccessToken(secrets);

  // Create PayPal subscription
  const response = await fetch(`${PAYPAL_API_URL}/v1/billing/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      plan_id: planId,
      custom_id: event.userId, // Used to link subscription to user
      application_context: {
        brand_name: "App Builder Studio",
        locale: "en-AU",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED",
        },
        return_url: event.successUrl,
        cancel_url: event.cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("PayPal API error:", error);
    throw new Error("Failed to create PayPal subscription");
  }

  const subscription = await response.json();

  // Find the approval URL
  const approvalLink = subscription.links?.find(
    (link: { rel: string }) => link.rel === "approve",
  );

  if (!approvalLink) {
    throw new Error("No approval URL in PayPal response");
  }

  return {
    checkoutUrl: approvalLink.href,
    sessionId: subscription.id,
  };
}

export async function handler(
  event: CreateCheckoutEvent,
): Promise<CreateCheckoutResponse> {
  console.log("Creating checkout session:", {
    userId: event.userId,
    tier: event.tier,
    provider: event.provider,
  });

  // Validate tier
  if (event.tier !== 1 && event.tier !== 2) {
    throw new Error("Invalid tier. Must be 1 (Supporter) or 2 (Champion)");
  }

  // Validate provider
  if (event.provider !== "stripe" && event.provider !== "paypal") {
    throw new Error("Invalid provider. Must be stripe or paypal");
  }

  if (event.provider === "stripe") {
    const secrets = await getStripeSecrets();
    return createStripeCheckout(event, secrets);
  } else {
    const secrets = await getPayPalSecrets();
    return createPayPalCheckout(event, secrets);
  }
}

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import crypto from 'crypto';
import type { SubscriptionTier, SubscriptionStatus } from '@quiz/shared';

const TABLE_NAME = process.env.TABLE_NAME!;
const SECRETS_ARN = process.env.STRIPE_SECRETS_ARN;

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const secretsClient = new SecretsManagerClient({});

// Cache secrets for Lambda warm starts
let cachedSecrets: { webhookSecret: string } | null = null;

interface StripeSecrets {
  webhookSecret: string;
  secretKey: string;
  publishableKey: string;
}

interface APIGatewayEvent {
  headers: Record<string, string | undefined>;
  body: string;
  isBase64Encoded?: boolean;
}

interface APIGatewayResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

// Stripe Event Types
interface StripeEventBase {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

interface StripeCheckoutSession {
  id: string;
  customer: string;
  subscription: string;
  metadata?: {
    userId?: string;
    tier?: string;
  };
}

interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_end?: number;
  items?: {
    data?: Array<{
      price?: {
        id: string;
      };
    }>;
  };
}

interface StripeInvoice {
  id: string;
  customer: string;
  subscription?: string;
}

interface StripeCheckoutEvent extends StripeEventBase {
  type: 'checkout.session.completed';
  data: {
    object: StripeCheckoutSession;
  };
}

interface StripeSubscriptionEvent extends StripeEventBase {
  type: 'customer.subscription.created' | 'customer.subscription.updated' | 'customer.subscription.deleted';
  data: {
    object: StripeSubscription;
  };
}

interface StripeInvoiceEvent extends StripeEventBase {
  type: 'invoice.payment_failed';
  data: {
    object: StripeInvoice;
  };
}

// Stripe subscription status mapping
const STRIPE_STATUS_MAP: Record<string, SubscriptionStatus> = {
  active: 'active',
  trialing: 'trialing',
  past_due: 'past_due',
  canceled: 'cancelled',
  unpaid: 'cancelled',
  incomplete: null,
  incomplete_expired: null,
};

// Stripe price ID to tier mapping (will be configured in Stripe Dashboard)
const STRIPE_PRICE_TO_TIER: Record<string, SubscriptionTier> = {
  // These will be replaced with actual Stripe price IDs
  price_supporter_monthly: 1,
  price_champion_monthly: 2,
};

async function getSecrets(): Promise<StripeSecrets> {
  if (cachedSecrets) {
    return cachedSecrets as StripeSecrets;
  }

  if (!SECRETS_ARN) {
    throw new Error('STRIPE_SECRETS_ARN not configured');
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SECRETS_ARN })
  );

  if (!response.SecretString) {
    throw new Error('Stripe secrets not found');
  }

  cachedSecrets = JSON.parse(response.SecretString);
  return cachedSecrets as StripeSecrets;
}

function verifyStripeSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // Stripe signature format: t=timestamp,v1=signature
  const elements = signature.split(',');
  const timestampElement = elements.find((e) => e.startsWith('t='));
  const signatureElement = elements.find((e) => e.startsWith('v1='));

  if (!timestampElement || !signatureElement) {
    console.error('Invalid signature format');
    return false;
  }

  const timestamp = timestampElement.substring(2);
  const expectedSignature = signatureElement.substring(3);

  // Create signed payload
  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Timing-safe comparison
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(computedSignature)
    );
  } catch {
    return false;
  }
}

function getTierFromPriceId(priceId: string): SubscriptionTier {
  // Check configured price IDs
  if (STRIPE_PRICE_TO_TIER[priceId] !== undefined) {
    return STRIPE_PRICE_TO_TIER[priceId];
  }

  // Fallback: check price ID naming convention
  if (priceId.includes('supporter')) return 1;
  if (priceId.includes('champion')) return 2;

  console.warn(`Unknown price ID: ${priceId}, defaulting to tier 1`);
  return 1;
}

async function findUserByStripeCustomerId(customerId: string): Promise<string | null> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `STRIPE#${customerId}`,
        },
        Limit: 1,
      })
    );

    if (result.Items && result.Items.length > 0) {
      // Extract userId from PK (format: USER#userId)
      const pk = result.Items[0].PK as string;
      return pk.replace('USER#', '');
    }

    return null;
  } catch (error) {
    console.error('Error finding user by Stripe customer ID:', error);
    return null;
  }
}

async function updateUserSubscription(
  userId: string,
  subscriptionId: string,
  customerId: string,
  tier: SubscriptionTier,
  status: SubscriptionStatus,
  currentPeriodEnd?: number
): Promise<void> {
  const now = new Date().toISOString();
  const expiresAt = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString()
    : null;

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: `
        SET subscription.tier = :tier,
            subscription.#st = :status,
            subscription.provider = :provider,
            subscription.subscriptionId = :subId,
            subscription.customerId = :custId,
            subscription.startedAt = if_not_exists(subscription.startedAt, :now),
            subscription.expiresAt = :expiresAt,
            GSI1PK = :gsi1pk,
            GSI1SK = :gsi1sk,
            updatedAt = :now
      `,
      ExpressionAttributeNames: {
        '#st': 'status',
      },
      ExpressionAttributeValues: {
        ':tier': tier,
        ':status': status,
        ':provider': 'stripe',
        ':subId': subscriptionId,
        ':custId': customerId,
        ':now': now,
        ':expiresAt': expiresAt,
        ':gsi1pk': `STRIPE#${customerId}`,
        ':gsi1sk': `SUB#${subscriptionId}`,
      },
    })
  );

  console.log(`Updated subscription for user ${userId}: tier=${tier}, status=${status}`);
}

async function handleCheckoutCompleted(event: StripeCheckoutEvent): Promise<void> {
  const session = event.data.object;

  // Get the user ID from metadata (set during checkout creation)
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  // Check if this is a tip payment
  if (session.metadata?.type === 'tip') {
    await handleTipPayment(userId);
    return;
  }

  const customerId = session.customer;
  const subscriptionId = session.subscription;

  // Get the subscription to find the price/tier
  // For now, we'll get tier from metadata or default to 1
  const tier = session.metadata?.tier
    ? (parseInt(session.metadata.tier, 10) as SubscriptionTier)
    : 1;

  await updateUserSubscription(
    userId,
    subscriptionId,
    customerId,
    tier,
    'active'
  );

  console.log(`Checkout completed for user ${userId}, tier ${tier}`);
}

async function handleTipPayment(userId: string): Promise<void> {
  const now = new Date();
  const tipUnlockedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours from now

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: `
        SET tipUnlockedUntil = :tipUnlockedUntil,
            updatedAt = :now
      `,
      ExpressionAttributeValues: {
        ':tipUnlockedUntil': tipUnlockedUntil,
        ':now': now.toISOString(),
      },
    })
  );

  console.log(`Tip payment processed for user ${userId}, unlocked until ${tipUnlockedUntil}`);
}

async function handleSubscriptionCreated(event: StripeSubscriptionEvent): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const status = STRIPE_STATUS_MAP[subscription.status] || null;

  // Get tier from first price item
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : 1;

  // Find user by customer ID
  const userId = await findUserByStripeCustomerId(customerId);
  if (!userId) {
    console.log(`No user found for Stripe customer ${customerId} - may be handled by checkout.session.completed`);
    return;
  }

  await updateUserSubscription(
    userId,
    subscriptionId,
    customerId,
    tier,
    status,
    subscription.current_period_end
  );
}

async function handleSubscriptionUpdated(event: StripeSubscriptionEvent): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;
  const status = STRIPE_STATUS_MAP[subscription.status] || null;

  // Get tier from first price item
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const tier = priceId ? getTierFromPriceId(priceId) : 1;

  const userId = await findUserByStripeCustomerId(customerId);
  if (!userId) {
    console.error(`No user found for Stripe customer ${customerId}`);
    return;
  }

  await updateUserSubscription(
    userId,
    subscriptionId,
    customerId,
    tier,
    status,
    subscription.current_period_end
  );

  console.log(`Subscription updated for user ${userId}: tier=${tier}, status=${status}`);
}

async function handleSubscriptionDeleted(event: StripeSubscriptionEvent): Promise<void> {
  const subscription = event.data.object;
  const customerId = subscription.customer;
  const subscriptionId = subscription.id;

  const userId = await findUserByStripeCustomerId(customerId);
  if (!userId) {
    console.error(`No user found for Stripe customer ${customerId}`);
    return;
  }

  const now = new Date().toISOString();

  // Set tier to 0 (free) and mark as cancelled
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: `
        SET subscription.tier = :tier,
            subscription.#st = :status,
            subscription.cancelledAt = :now,
            updatedAt = :now
      `,
      ExpressionAttributeNames: {
        '#st': 'status',
      },
      ExpressionAttributeValues: {
        ':tier': 0,
        ':status': 'cancelled',
        ':now': now,
      },
    })
  );

  console.log(`Subscription cancelled for user ${userId}`);
}

async function logWebhookEvent(
  eventId: string,
  eventType: string,
  payload: Record<string, unknown>,
  status: 'received' | 'processed' | 'error',
  errorMessage?: string
): Promise<void> {
  const now = new Date();
  const timestamp = now.toISOString();

  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: 'WEBHOOK_LOG',
          SK: `STRIPE#${timestamp}#${eventId}`,
          GSI1PK: 'WEBHOOK_LOG#STRIPE',
          GSI1SK: timestamp,
          provider: 'stripe',
          eventId,
          eventType,
          payload: JSON.stringify(payload),
          status,
          errorMessage,
          createdAt: timestamp,
          // TTL: 30 days from now
          ttl: Math.floor(now.getTime() / 1000) + 30 * 24 * 60 * 60,
        },
      })
    );
  } catch (error) {
    console.error('Failed to log webhook event:', error);
  }
}

async function handlePaymentFailed(event: StripeInvoiceEvent): Promise<void> {
  const invoice = event.data.object;
  const customerId = invoice.customer;
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    // Not a subscription payment
    return;
  }

  const userId = await findUserByStripeCustomerId(customerId);
  if (!userId) {
    console.error(`No user found for Stripe customer ${customerId}`);
    return;
  }

  const now = new Date().toISOString();

  // Mark subscription as past_due
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: `
        SET subscription.#st = :status,
            updatedAt = :now
      `,
      ExpressionAttributeNames: {
        '#st': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'past_due',
        ':now': now,
      },
    })
  );

  console.log(`Payment failed for user ${userId}, marked as past_due`);
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  console.log('Stripe webhook received');

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // Get the signature from headers
    const signature = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
    if (!signature) {
      console.error('Missing Stripe signature');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing signature' }),
      };
    }

    // Get webhook secret
    const secrets = await getSecrets();

    // Get raw body
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;

    // Verify signature
    if (!verifyStripeSignature(rawBody, signature, secrets.webhookSecret)) {
      console.error('Invalid Stripe signature');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Parse event
    const stripeEvent = JSON.parse(rawBody);
    const eventType = stripeEvent.type;
    const eventId = stripeEvent.id;

    console.log(`Processing Stripe event: ${eventType} (${eventId})`);

    // Log webhook received
    await logWebhookEvent(eventId, eventType, stripeEvent, 'received');

    try {
      // Handle different event types
      switch (eventType) {
        case 'checkout.session.completed':
          await handleCheckoutCompleted(stripeEvent);
          break;

        case 'customer.subscription.created':
          await handleSubscriptionCreated(stripeEvent);
          break;

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(stripeEvent);
          break;

        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(stripeEvent);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(stripeEvent);
          break;

        default:
          console.log(`Unhandled event type: ${eventType}`);
      }

      // Log webhook processed successfully
      await logWebhookEvent(eventId, eventType, stripeEvent, 'processed');
    } catch (processingError) {
      // Log webhook processing error
      const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
      await logWebhookEvent(eventId, eventType, stripeEvent, 'error', errorMessage);
      throw processingError;
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Error processing Stripe webhook:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

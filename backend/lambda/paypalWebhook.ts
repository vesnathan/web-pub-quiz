import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import type { SubscriptionTier, SubscriptionStatus } from '@quiz/shared';

const TABLE_NAME = process.env.TABLE_NAME!;
const SECRETS_ARN = process.env.PAYPAL_SECRETS_ARN;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.paypal.com';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const secretsClient = new SecretsManagerClient({});

// Cache secrets for Lambda warm starts
let cachedSecrets: PayPalSecrets | null = null;

interface PayPalSecrets {
  clientId: string;
  clientSecret: string;
  webhookId: string;
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

// PayPal Event Types
interface PayPalBillingInfo {
  next_billing_time?: string;
}

interface PayPalSubscriptionResource {
  id: string;
  plan_id: string;
  status: string;
  custom_id?: string;
  billing_info?: PayPalBillingInfo;
}

interface PayPalSubscriptionEvent {
  event_type: string;
  resource: PayPalSubscriptionResource;
}

// PayPal subscription status mapping
const PAYPAL_STATUS_MAP: Record<string, SubscriptionStatus> = {
  ACTIVE: 'active',
  APPROVED: 'active',
  SUSPENDED: 'past_due',
  CANCELLED: 'cancelled',
  EXPIRED: 'cancelled',
};

// PayPal plan ID to tier mapping (will be configured in PayPal Dashboard)
const PAYPAL_PLAN_TO_TIER: Record<string, SubscriptionTier> = {
  // These will be replaced with actual PayPal plan IDs
  'P-supporter-monthly': 1,
  'P-champion-monthly': 2,
};

async function getSecrets(): Promise<PayPalSecrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  if (!SECRETS_ARN) {
    throw new Error('PAYPAL_SECRETS_ARN not configured');
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: SECRETS_ARN })
  );

  if (!response.SecretString) {
    throw new Error('PayPal secrets not found');
  }

  cachedSecrets = JSON.parse(response.SecretString);
  return cachedSecrets!;
}

async function getPayPalAccessToken(secrets: PayPalSecrets): Promise<string> {
  const auth = Buffer.from(`${secrets.clientId}:${secrets.clientSecret}`).toString('base64');

  const response = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function verifyPayPalWebhook(
  headers: Record<string, string | undefined>,
  body: string,
  secrets: PayPalSecrets
): Promise<boolean> {
  try {
    const accessToken = await getPayPalAccessToken(secrets);

    const verifyPayload = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: secrets.webhookId,
      webhook_event: JSON.parse(body),
    };

    const response = await fetch(
      `${PAYPAL_API_URL}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verifyPayload),
      }
    );

    if (!response.ok) {
      console.error(`PayPal verification failed: ${response.status}`);
      return false;
    }

    const result = await response.json();
    return result.verification_status === 'SUCCESS';
  } catch (error) {
    console.error('Error verifying PayPal webhook:', error);
    return false;
  }
}

function getTierFromPlanId(planId: string): SubscriptionTier {
  if (PAYPAL_PLAN_TO_TIER[planId] !== undefined) {
    return PAYPAL_PLAN_TO_TIER[planId];
  }

  // Fallback: check plan ID naming convention
  if (planId.toLowerCase().includes('supporter')) return 1;
  if (planId.toLowerCase().includes('champion')) return 2;

  console.warn(`Unknown plan ID: ${planId}, defaulting to tier 1`);
  return 1;
}

async function findUserByPayPalSubscriptionId(subscriptionId: string): Promise<string | null> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `PAYPAL#${subscriptionId}`,
        },
        Limit: 1,
      })
    );

    if (result.Items && result.Items.length > 0) {
      const pk = result.Items[0].PK as string;
      return pk.replace('USER#', '');
    }

    return null;
  } catch (error) {
    console.error('Error finding user by PayPal subscription ID:', error);
    return null;
  }
}

async function updateUserSubscription(
  userId: string,
  subscriptionId: string,
  tier: SubscriptionTier,
  status: SubscriptionStatus,
  nextBillingTime?: string
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      UpdateExpression: `
        SET subscription.tier = :tier,
            subscription.#st = :status,
            subscription.provider = :provider,
            subscription.subscriptionId = :subId,
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
        ':provider': 'paypal',
        ':subId': subscriptionId,
        ':now': now,
        ':expiresAt': nextBillingTime || null,
        ':gsi1pk': `PAYPAL#${subscriptionId}`,
        ':gsi1sk': 'SUBSCRIPTION',
      },
    })
  );

  console.log(`Updated PayPal subscription for user ${userId}: tier=${tier}, status=${status}`);
}

async function handleSubscriptionCreated(event: PayPalSubscriptionEvent): Promise<void> {
  const resource = event.resource;
  const subscriptionId = resource.id;
  const planId = resource.plan_id;
  const status = PAYPAL_STATUS_MAP[resource.status] || null;
  const tier = getTierFromPlanId(planId);

  // Get user ID from custom_id (set during subscription creation)
  const userId = resource.custom_id;
  if (!userId) {
    console.error('No custom_id (userId) in PayPal subscription');
    return;
  }

  await updateUserSubscription(
    userId,
    subscriptionId,
    tier,
    status,
    resource.billing_info?.next_billing_time
  );

  console.log(`PayPal subscription created for user ${userId}, tier ${tier}`);
}

async function handleSubscriptionActivated(event: PayPalSubscriptionEvent): Promise<void> {
  const resource = event.resource;
  const subscriptionId = resource.id;
  const planId = resource.plan_id;
  const tier = getTierFromPlanId(planId);

  // Try to find user by subscription ID first
  let userId = await findUserByPayPalSubscriptionId(subscriptionId);

  // If not found, try custom_id
  if (!userId && resource.custom_id) {
    userId = resource.custom_id;
  }

  if (!userId) {
    console.error(`No user found for PayPal subscription ${subscriptionId}`);
    return;
  }

  await updateUserSubscription(
    userId,
    subscriptionId,
    tier,
    'active',
    resource.billing_info?.next_billing_time
  );

  console.log(`PayPal subscription activated for user ${userId}`);
}

async function handleSubscriptionUpdated(event: PayPalSubscriptionEvent): Promise<void> {
  const resource = event.resource;
  const subscriptionId = resource.id;
  const planId = resource.plan_id;
  const status = PAYPAL_STATUS_MAP[resource.status] || null;
  const tier = getTierFromPlanId(planId);

  const userId = await findUserByPayPalSubscriptionId(subscriptionId);
  if (!userId) {
    console.error(`No user found for PayPal subscription ${subscriptionId}`);
    return;
  }

  await updateUserSubscription(
    userId,
    subscriptionId,
    tier,
    status,
    resource.billing_info?.next_billing_time
  );

  console.log(`PayPal subscription updated for user ${userId}: tier=${tier}, status=${status}`);
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
          SK: `PAYPAL#${timestamp}#${eventId}`,
          GSI1PK: 'WEBHOOK_LOG#PAYPAL',
          GSI1SK: timestamp,
          provider: 'paypal',
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

async function handleSubscriptionCancelled(event: PayPalSubscriptionEvent): Promise<void> {
  const resource = event.resource;
  const subscriptionId = resource.id;

  const userId = await findUserByPayPalSubscriptionId(subscriptionId);
  if (!userId) {
    console.error(`No user found for PayPal subscription ${subscriptionId}`);
    return;
  }

  const now = new Date().toISOString();

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

  console.log(`PayPal subscription cancelled for user ${userId}`);
}

async function handleSubscriptionSuspended(event: PayPalSubscriptionEvent): Promise<void> {
  const resource = event.resource;
  const subscriptionId = resource.id;

  const userId = await findUserByPayPalSubscriptionId(subscriptionId);
  if (!userId) {
    console.error(`No user found for PayPal subscription ${subscriptionId}`);
    return;
  }

  const now = new Date().toISOString();

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

  console.log(`PayPal subscription suspended for user ${userId}`);
}

interface PayPalOrderEvent {
  event_type: string;
  resource: {
    id: string;
    purchase_units?: Array<{
      custom_id?: string;
    }>;
    custom_id?: string;
  };
}

async function handleTipPayment(event: PayPalOrderEvent): Promise<void> {
  const resource = event.resource;

  // Get userId from custom_id (set during order creation)
  const userId = resource.purchase_units?.[0]?.custom_id || resource.custom_id;
  if (!userId) {
    console.log('PayPal order without custom_id (userId) - not a tip');
    return;
  }

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

  console.log(`PayPal tip payment processed for user ${userId}, unlocked until ${tipUnlockedUntil}`);
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayResponse> {
  console.log('PayPal webhook received');

  const corsHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  try {
    // Get secrets
    const secrets = await getSecrets();

    // Get raw body
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf-8')
      : event.body;

    // Verify webhook signature
    const isValid = await verifyPayPalWebhook(event.headers, rawBody, secrets);
    if (!isValid) {
      console.error('Invalid PayPal webhook signature');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Parse event
    const paypalEvent = JSON.parse(rawBody);
    const eventType = paypalEvent.event_type;
    const eventId = paypalEvent.id;

    console.log(`Processing PayPal event: ${eventType} (${eventId})`);

    // Log webhook received
    await logWebhookEvent(eventId, eventType, paypalEvent, 'received');

    try {
      // Handle different event types
      switch (eventType) {
        case 'BILLING.SUBSCRIPTION.CREATED':
          await handleSubscriptionCreated(paypalEvent);
          break;

        case 'BILLING.SUBSCRIPTION.ACTIVATED':
          await handleSubscriptionActivated(paypalEvent);
          break;

        case 'BILLING.SUBSCRIPTION.UPDATED':
          await handleSubscriptionUpdated(paypalEvent);
          break;

        case 'BILLING.SUBSCRIPTION.CANCELLED':
          await handleSubscriptionCancelled(paypalEvent);
          break;

        case 'BILLING.SUBSCRIPTION.SUSPENDED':
          await handleSubscriptionSuspended(paypalEvent);
          break;

        case 'PAYMENT.SALE.COMPLETED':
          // Payment successful - subscription should already be active
          console.log('PayPal payment completed');
          break;

        case 'CHECKOUT.ORDER.APPROVED':
        case 'PAYMENT.CAPTURE.COMPLETED':
          // One-time payment (tip) completed
          await handleTipPayment(paypalEvent);
          break;

        default:
          console.log(`Unhandled PayPal event type: ${eventType}`);
      }

      // Log webhook processed successfully
      await logWebhookEvent(eventId, eventType, paypalEvent, 'processed');
    } catch (processingError) {
      // Log webhook processing error
      const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
      await logWebhookEvent(eventId, eventType, paypalEvent, 'error', errorMessage);
      throw processingError;
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Error processing PayPal webhook:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
}

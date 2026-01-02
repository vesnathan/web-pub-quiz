import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const STRIPE_SECRETS_ARN = process.env.STRIPE_SECRETS_ARN;
const PAYPAL_SECRETS_ARN = process.env.PAYPAL_SECRETS_ARN;
const PAYPAL_API_URL = process.env.PAYPAL_API_URL || 'https://api-m.paypal.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://quiznight.live';

const secretsClient = new SecretsManagerClient({});

// Cache secrets
let stripeSecrets: StripeSecrets | null = null;
let paypalSecrets: PayPalSecrets | null = null;

interface StripeSecrets {
  secretKey: string;
  tipPriceId: string; // $2 one-time price ID
}

interface PayPalSecrets {
  clientId: string;
  clientSecret: string;
}

interface CreateTipCheckoutEvent {
  userId: string;
  provider: 'stripe' | 'paypal';
}

interface CreateTipCheckoutResponse {
  checkoutUrl: string;
  sessionId?: string;
}

async function getStripeSecrets(): Promise<StripeSecrets> {
  if (stripeSecrets) return stripeSecrets;

  if (!STRIPE_SECRETS_ARN) {
    throw new Error('STRIPE_SECRETS_ARN not configured');
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: STRIPE_SECRETS_ARN })
  );

  if (!response.SecretString) {
    throw new Error('Stripe secrets not found');
  }

  stripeSecrets = JSON.parse(response.SecretString);
  return stripeSecrets!;
}

async function getPayPalSecrets(): Promise<PayPalSecrets> {
  if (paypalSecrets) return paypalSecrets;

  if (!PAYPAL_SECRETS_ARN) {
    throw new Error('PAYPAL_SECRETS_ARN not configured');
  }

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: PAYPAL_SECRETS_ARN })
  );

  if (!response.SecretString) {
    throw new Error('PayPal secrets not found');
  }

  paypalSecrets = JSON.parse(response.SecretString);
  return paypalSecrets!;
}

async function createStripeTipCheckout(
  event: CreateTipCheckoutEvent,
  secrets: StripeSecrets
): Promise<CreateTipCheckoutResponse> {
  const successUrl = `${FRONTEND_URL}/tip?success=true`;
  const cancelUrl = `${FRONTEND_URL}/tip?cancelled=true`;

  // Create Stripe Checkout Session for one-time payment
  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secrets.secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      mode: 'payment', // One-time payment, not subscription
      'line_items[0][price]': secrets.tipPriceId,
      'line_items[0][quantity]': '1',
      success_url: successUrl,
      cancel_url: cancelUrl,
      'metadata[userId]': event.userId,
      'metadata[type]': 'tip',
      'payment_intent_data[statement_descriptor]': 'APP BUILDER STUDIO',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Stripe API error:', error);
    throw new Error('Failed to create Stripe checkout session');
  }

  const session = await response.json();

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
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

async function createPayPalTipCheckout(
  event: CreateTipCheckoutEvent,
  secrets: PayPalSecrets
): Promise<CreateTipCheckoutResponse> {
  const successUrl = `${FRONTEND_URL}/tip?success=true`;
  const cancelUrl = `${FRONTEND_URL}/tip?cancelled=true`;

  const accessToken = await getPayPalAccessToken(secrets);

  // Create PayPal order for one-time payment
  const response = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: '2.00',
          },
          description: 'QuizNight.live Tip - 24hr Unlimited Sets',
          custom_id: event.userId, // Used to link payment to user
        },
      ],
      application_context: {
        brand_name: 'App Builder Studio',
        locale: 'en-AU',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: successUrl,
        cancel_url: cancelUrl,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('PayPal API error:', error);
    throw new Error('Failed to create PayPal order');
  }

  const order = await response.json();

  // Find the approval URL
  const approvalLink = order.links?.find(
    (link: { rel: string }) => link.rel === 'approve'
  );

  if (!approvalLink) {
    throw new Error('No approval URL in PayPal response');
  }

  return {
    checkoutUrl: approvalLink.href,
    sessionId: order.id,
  };
}

export async function handler(event: CreateTipCheckoutEvent): Promise<CreateTipCheckoutResponse> {
  console.log('Creating tip checkout:', {
    userId: event.userId,
    provider: event.provider,
  });

  // Validate provider
  if (event.provider !== 'stripe' && event.provider !== 'paypal') {
    throw new Error('Invalid provider. Must be stripe or paypal');
  }

  if (event.provider === 'stripe') {
    const secrets = await getStripeSecrets();
    return createStripeTipCheckout(event, secrets);
  } else {
    const secrets = await getPayPalSecrets();
    return createPayPalTipCheckout(event, secrets);
  }
}

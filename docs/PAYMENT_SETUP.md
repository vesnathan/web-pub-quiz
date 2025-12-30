# Payment Integration Setup Guide

Step-by-step guide for setting up Stripe and PayPal subscriptions for QuizNight.live.

---

## Prerequisites

- AWS CLI configured with appropriate permissions
- Access to Stripe Dashboard (https://dashboard.stripe.com)
- Access to PayPal Developer Dashboard (https://developer.paypal.com)
- CloudFormation stack deployed with payment resources

---

## Part 1: Deploy Infrastructure

### 1.1 Deploy CloudFormation Stack

```bash
cd ~/dev/quiz-app
yarn workspace @quiz/deploy deploy:prod
```

### 1.2 Get Webhook URLs from Stack Outputs

```bash
aws cloudformation describe-stacks \
  --stack-name wpq-prod \
  --query "Stacks[0].Outputs[?contains(OutputKey, 'Webhook')].{Key:OutputKey,Value:OutputValue}" \
  --output table
```

You'll see:
- `StripeWebhookUrl` - e.g., `https://abc123.execute-api.ap-southeast-2.amazonaws.com/prod/webhooks/stripe`
- `PayPalWebhookUrl` - e.g., `https://abc123.execute-api.ap-southeast-2.amazonaws.com/prod/webhooks/paypal`

**Save these URLs** - you'll need them for Stripe and PayPal configuration.

---

## Part 2: Stripe Setup

### 2.1 Create Stripe Account

1. Go to https://dashboard.stripe.com
2. Sign up or log in
3. Complete business verification (required for live payments)

### 2.2 Create Products and Prices

**In Stripe Dashboard → Products:**

#### Supporter Tier ($3/month)

1. Click **+ Add product**
2. Fill in:
   - **Name:** `Supporter`
   - **Description:** `Unlimited quiz sets, patron badge, patron leaderboard`
3. Under **Pricing:**
   - **Price:** `$3.00 AUD`
   - **Billing period:** `Monthly`
   - **Price ID:** Note this (e.g., `price_1ABC123...`) ← **SAVE THIS**
4. Click **Save product**

#### Champion Tier ($10/month)

1. Click **+ Add product**
2. Fill in:
   - **Name:** `Champion`
   - **Description:** `Everything in Supporter plus ad-free, private rooms, custom quizzes`
3. Under **Pricing:**
   - **Price:** `$10.00 AUD`
   - **Billing period:** `Monthly`
   - **Price ID:** Note this (e.g., `price_2DEF456...`) ← **SAVE THIS**
4. Click **Save product**

### 2.3 Create Webhook Endpoint

**In Stripe Dashboard → Developers → Webhooks:**

1. Click **+ Add endpoint**
2. **Endpoint URL:** Paste your `StripeWebhookUrl` from step 1.2
3. **Description:** `QuizNight.live subscription events`
4. **Listen to:** Select specific events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
5. Click **Add endpoint**
6. Click on the new endpoint, then **Reveal** under Signing secret
7. Copy the webhook secret (starts with `whsec_...`) ← **SAVE THIS**

### 2.4 Get API Keys

**In Stripe Dashboard → Developers → API keys:**

1. Copy **Publishable key** (starts with `pk_live_...` or `pk_test_...`) ← **SAVE THIS**
2. Click **Reveal** on Secret key, copy it (starts with `sk_live_...` or `sk_test_...`) ← **SAVE THIS**

### 2.5 Update AWS Secrets Manager

```bash
# Get current secret ARN
STRIPE_SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name wpq-prod \
  --query "Stacks[0].Outputs[?OutputKey=='StripeSecretsArn'].OutputValue" \
  --output text)

# Update with real values
aws secretsmanager put-secret-value \
  --secret-id "$STRIPE_SECRET_ARN" \
  --secret-string '{
    "secretKey": "sk_live_YOUR_SECRET_KEY",
    "publishableKey": "pk_live_YOUR_PUBLISHABLE_KEY",
    "webhookSecret": "whsec_YOUR_WEBHOOK_SECRET",
    "priceIdSupporter": "price_YOUR_SUPPORTER_PRICE_ID",
    "priceIdChampion": "price_YOUR_CHAMPION_PRICE_ID"
  }'
```

**Replace the placeholder values with your actual keys from steps 2.2-2.4.**

---

## Part 3: PayPal Setup

### 3.1 Create PayPal Developer Account

1. Go to https://developer.paypal.com
2. Log in with your PayPal Business account (or create one)
3. Go to **Dashboard**

### 3.2 Create App for API Credentials

**In PayPal Developer Dashboard → Apps & Credentials:**

1. Click **Create App**
2. **App Name:** `QuizNight.live`
3. **App Type:** `Merchant`
4. Click **Create App**
5. Note the **Client ID** ← **SAVE THIS**
6. Click **Show** under Secret, copy it ← **SAVE THIS**

### 3.3 Create Subscription Plans

**In PayPal Developer Dashboard → Sandbox/Live → Subscriptions → Plans:**

Or use the API (recommended for consistency):

```bash
# Get access token first
ACCESS_TOKEN=$(curl -s -X POST "https://api-m.paypal.com/v1/oauth2/token" \
  -H "Accept: application/json" \
  -H "Accept-Language: en_US" \
  -u "YOUR_CLIENT_ID:YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials" | jq -r '.access_token')

# Create Supporter Product
curl -s -X POST "https://api-m.paypal.com/v1/catalogs/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "QuizNight Supporter",
    "description": "Unlimited quiz sets, patron badge, patron leaderboard",
    "type": "SERVICE",
    "category": "SOFTWARE"
  }' | jq '.id'
# Note the product ID (e.g., PROD-ABC123)

# Create Supporter Plan ($3/month)
curl -s -X POST "https://api-m.paypal.com/v1/billing/plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "product_id": "PROD-ABC123",
    "name": "Supporter Monthly",
    "description": "Monthly subscription for Supporter tier",
    "billing_cycles": [
      {
        "frequency": {"interval_unit": "MONTH", "interval_count": 1},
        "tenure_type": "REGULAR",
        "sequence": 1,
        "total_cycles": 0,
        "pricing_scheme": {
          "fixed_price": {"value": "3.00", "currency_code": "AUD"}
        }
      }
    ],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "payment_failure_threshold": 3
    }
  }' | jq '.id'
# Note the plan ID (e.g., P-ABC123) ← SAVE THIS AS planIdSupporter

# Create Champion Product
curl -s -X POST "https://api-m.paypal.com/v1/catalogs/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "name": "QuizNight Champion",
    "description": "Ad-free, private rooms, custom quizzes, and more",
    "type": "SERVICE",
    "category": "SOFTWARE"
  }' | jq '.id'
# Note the product ID (e.g., PROD-DEF456)

# Create Champion Plan ($10/month)
curl -s -X POST "https://api-m.paypal.com/v1/billing/plans" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "product_id": "PROD-DEF456",
    "name": "Champion Monthly",
    "description": "Monthly subscription for Champion tier",
    "billing_cycles": [
      {
        "frequency": {"interval_unit": "MONTH", "interval_count": 1},
        "tenure_type": "REGULAR",
        "sequence": 1,
        "total_cycles": 0,
        "pricing_scheme": {
          "fixed_price": {"value": "10.00", "currency_code": "AUD"}
        }
      }
    ],
    "payment_preferences": {
      "auto_bill_outstanding": true,
      "payment_failure_threshold": 3
    }
  }' | jq '.id'
# Note the plan ID (e.g., P-DEF456) ← SAVE THIS AS planIdChampion
```

### 3.4 Create Webhook

**In PayPal Developer Dashboard → Apps & Credentials → Your App → Webhooks:**

1. Click **Add Webhook**
2. **Webhook URL:** Paste your `PayPalWebhookUrl` from step 1.2
3. **Events:** Select these event types:
   - `BILLING.SUBSCRIPTION.CREATED`
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.UPDATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `PAYMENT.SALE.COMPLETED`
4. Click **Save**
5. Note the **Webhook ID** shown ← **SAVE THIS**

### 3.5 Update AWS Secrets Manager

```bash
# Get current secret ARN
PAYPAL_SECRET_ARN=$(aws cloudformation describe-stacks \
  --stack-name wpq-prod \
  --query "Stacks[0].Outputs[?OutputKey=='PayPalSecretsArn'].OutputValue" \
  --output text)

# Update with real values
aws secretsmanager put-secret-value \
  --secret-id "$PAYPAL_SECRET_ARN" \
  --secret-string '{
    "clientId": "YOUR_CLIENT_ID",
    "clientSecret": "YOUR_CLIENT_SECRET",
    "webhookId": "YOUR_WEBHOOK_ID",
    "planIdSupporter": "P-YOUR_SUPPORTER_PLAN_ID",
    "planIdChampion": "P-YOUR_CHAMPION_PLAN_ID"
  }'
```

---

## Part 4: Frontend Configuration

### 4.1 Add Stripe Publishable Key to Environment

Create/update `frontend/.env.local`:

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_PUBLISHABLE_KEY
```

### 4.2 Add PayPal Client ID to Environment

```bash
NEXT_PUBLIC_PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID
```

---

## Part 5: Testing

### 5.1 Test Stripe Webhook

```bash
# Install Stripe CLI (if not installed)
# macOS: brew install stripe/stripe-cli/stripe
# Or download from: https://stripe.com/docs/stripe-cli

# Login to Stripe CLI
stripe login

# Forward webhooks to local (for development)
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger a test event
stripe trigger checkout.session.completed
```

### 5.2 Test PayPal Webhook (Manual)

1. Go to PayPal Developer Dashboard → Sandbox → Webhooks
2. Click **Simulate Event** on your webhook
3. Select `BILLING.SUBSCRIPTION.ACTIVATED`
4. Click **Send Test**
5. Check CloudWatch logs for the Lambda

### 5.3 End-to-End Test

1. Go to https://quiznight.live/subscribe
2. Click "Subscribe with Card" on Supporter tier
3. Complete checkout with Stripe test card: `4242 4242 4242 4242`
4. Verify subscription is active in your profile

---

## Part 6: Going Live Checklist

### Stripe
- [ ] Complete Stripe business verification
- [ ] Switch from test mode to live mode
- [ ] Update secrets with live API keys
- [ ] Create live webhook endpoint
- [ ] Create live products and prices
- [ ] Test a real $1 transaction, then refund

### PayPal
- [ ] Switch app from Sandbox to Live
- [ ] Update secrets with live API credentials
- [ ] Create live subscription plans
- [ ] Create live webhook endpoint
- [ ] Test a real transaction

### Frontend
- [ ] Update environment variables to live keys
- [ ] Rebuild and deploy frontend

---

## Troubleshooting

### Webhook not receiving events

1. Check CloudWatch logs:
```bash
aws logs tail /aws/lambda/wpq-stripe-webhook-prod --follow
aws logs tail /aws/lambda/wpq-paypal-webhook-prod --follow
```

2. Verify webhook URL is correct in Stripe/PayPal dashboard

3. Check API Gateway logs if Lambda not being invoked

### Subscription not updating in DynamoDB

1. Check Lambda has correct IAM permissions
2. Verify table name in environment variables
3. Check for errors in CloudWatch logs

### "Invalid signature" errors

1. Verify webhook secret is correct in Secrets Manager
2. Ensure raw body is being passed (not parsed JSON)
3. Check timestamp - webhooks expire after 5 minutes

---

## Reference: Secrets Format

### Stripe Secrets
```json
{
  "secretKey": "sk_live_...",
  "publishableKey": "pk_live_...",
  "webhookSecret": "whsec_...",
  "priceIdSupporter": "price_...",
  "priceIdChampion": "price_..."
}
```

### PayPal Secrets
```json
{
  "clientId": "...",
  "clientSecret": "...",
  "webhookId": "...",
  "planIdSupporter": "P-...",
  "planIdChampion": "P-..."
}
```

---

## Support

- Stripe Documentation: https://stripe.com/docs
- PayPal Subscriptions API: https://developer.paypal.com/docs/api/subscriptions/v1/
- AWS Secrets Manager: https://docs.aws.amazon.com/secretsmanager/

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import type { AppSyncResolverEvent } from "aws-lambda";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const secretsClient = new SecretsManagerClient({});
const sesClient = new SESClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const RECAPTCHA_SECRETS_ARN = process.env.RECAPTCHA_SECRETS_ARN!;
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL!;
const FRONTEND_URL = process.env.FRONTEND_URL!;

const DAILY_INVITE_LIMIT = 5;
const RECAPTCHA_SCORE_THRESHOLD = 0.5;

interface RecaptchaSecrets {
  siteKey: string;
  secretKey: string;
}

interface SendInviteArgs {
  friendName: string;
  email: string;
  recaptchaToken: string;
}

interface UserProfile {
  id: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
}

// Cache secrets for Lambda warm starts
let cachedRecaptchaSecrets: RecaptchaSecrets | null = null;

async function getRecaptchaSecrets(): Promise<RecaptchaSecrets> {
  if (cachedRecaptchaSecrets) return cachedRecaptchaSecrets;

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: RECAPTCHA_SECRETS_ARN })
  );

  cachedRecaptchaSecrets = JSON.parse(response.SecretString!) as RecaptchaSecrets;
  return cachedRecaptchaSecrets;
}

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secrets = await getRecaptchaSecrets();

  const response = await fetch(
    "https://www.google.com/recaptcha/api/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secrets.secretKey,
        response: token,
      }),
    }
  );

  const result = (await response.json()) as {
    success: boolean;
    score?: number;
    action?: string;
  };

  console.log("reCAPTCHA verification result:", JSON.stringify(result));

  return result.success && (result.score ?? 0) >= RECAPTCHA_SCORE_THRESHOLD;
}

async function checkRateLimit(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `INVITE_COUNT#${today}`,
      },
    })
  );

  const currentCount = result.Item?.count ?? 0;
  return currentCount < DAILY_INVITE_LIMIT;
}

async function incrementInviteCount(userId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const ttl = Math.floor(Date.now() / 1000) + 86400 * 2; // 2 days TTL

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `INVITE_COUNT#${today}`,
      },
      UpdateExpression:
        "SET #count = if_not_exists(#count, :zero) + :inc, #ttl = :ttl",
      ExpressionAttributeNames: {
        "#count": "count",
        "#ttl": "ttl",
      },
      ExpressionAttributeValues: {
        ":zero": 0,
        ":inc": 1,
        ":ttl": ttl,
      },
    })
  );
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: "PROFILE",
      },
    })
  );

  if (!result.Item) return null;

  return {
    id: result.Item.id,
    displayName: result.Item.displayName,
    firstName: result.Item.firstName,
    lastName: result.Item.lastName,
  };
}

async function logInvite(
  userId: string,
  recipientEmail: string,
  recipientName: string
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `INVITE#${now}`,
        GSI1PK: "INVITE",
        GSI1SK: now,
        recipientEmail,
        recipientName,
        createdAt: now,
        ttl: Math.floor(Date.now() / 1000) + 86400 * 90, // 90 days TTL
      },
    })
  );
}

function generateEmailHtml(
  senderName: string,
  friendName: string,
  referralUrl: string
): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #1a1a2e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a2e; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #16213e; border-radius: 12px; overflow: hidden; max-width: 100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🎯 Quiz Night Live</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #ffffff; margin: 0 0 20px; font-size: 24px; text-align: center;">
                Hi ${friendName}!
              </h2>
              <p style="color: #a0aec0; font-size: 18px; line-height: 1.6; text-align: center; margin: 0 0 10px;">
                <strong style="color: #ffffff;">${senderName}</strong> wants to play Quiz Night Live with you!
              </p>
              <p style="color: #a0aec0; font-size: 16px; line-height: 1.6; text-align: center;">
                Join the ultimate real-time pub quiz experience. Compete with players from around the world in live trivia battles!
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${referralUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block;">
                      Join the Quiz →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Features -->
              <table width="100%" style="margin-top: 30px; border-top: 1px solid #2d3748; padding-top: 20px;">
                <tr>
                  <td style="color: #a0aec0; font-size: 14px; padding: 8px 0;">
                    <span style="color: #48bb78;">✓</span> Live multiplayer trivia battles
                  </td>
                </tr>
                <tr>
                  <td style="color: #a0aec0; font-size: 14px; padding: 8px 0;">
                    <span style="color: #48bb78;">✓</span> Earn badges & climb the leaderboards
                  </td>
                </tr>
                <tr>
                  <td style="color: #a0aec0; font-size: 14px; padding: 8px 0;">
                    <span style="color: #48bb78;">✓</span> Free to play - no credit card required
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                You received this email because ${senderName} invited you to Quiz Night Live.
              </p>
              <p style="color: #64748b; font-size: 12px; margin: 10px 0 0;">
                <a href="${FRONTEND_URL}" style="color: #667eea; text-decoration: none;">quiznight.live</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateEmailText(
  senderName: string,
  friendName: string,
  referralUrl: string
): string {
  return `Hi ${friendName}!

${senderName} wants to play Quiz Night Live with you!

Join the ultimate real-time pub quiz experience. Compete with players from around the world in live trivia battles!

Join now: ${referralUrl}

Features:
- Live multiplayer trivia battles
- Earn badges & climb the leaderboards
- Free to play - no credit card required

---
You received this email because ${senderName} invited you to Quiz Night Live.
${FRONTEND_URL}`;
}

export async function handler(
  event: AppSyncResolverEvent<SendInviteArgs>
): Promise<boolean> {
  console.log("SendInvite event:", JSON.stringify(event, null, 2));

  const userId = event.identity?.sub;
  if (!userId) {
    throw new Error("Unauthorized: User not authenticated");
  }

  const { friendName, email, recaptchaToken } = event.arguments;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email address");
  }

  // Verify reCAPTCHA
  const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
  if (!isValidRecaptcha) {
    console.warn(`reCAPTCHA verification failed for user ${userId}`);
    throw new Error("reCAPTCHA verification failed. Please try again.");
  }

  // Check rate limit
  const withinLimit = await checkRateLimit(userId);
  if (!withinLimit) {
    throw new Error(
      `Daily invite limit reached (${DAILY_INVITE_LIMIT} per day). Try again tomorrow!`
    );
  }

  // Get sender's profile
  const senderProfile = await getUserProfile(userId);
  if (!senderProfile) {
    throw new Error("User profile not found");
  }

  // Build sender name (prefer full name, fallback to displayName)
  const senderName =
    senderProfile.firstName && senderProfile.lastName
      ? `${senderProfile.firstName} ${senderProfile.lastName}`
      : senderProfile.displayName;

  // Generate referral URL
  const referralUrl = `${FRONTEND_URL}/?ref=${userId}`;

  // Send email via SES
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: SES_FROM_EMAIL,
        Destination: {
          ToAddresses: [email],
        },
        Message: {
          Subject: {
            Data: `${senderName} wants to play Quiz Night Live with you!`,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: generateEmailHtml(senderName, friendName, referralUrl),
              Charset: "UTF-8",
            },
            Text: {
              Data: generateEmailText(senderName, friendName, referralUrl),
              Charset: "UTF-8",
            },
          },
        },
      })
    );

    console.log(`Invite email sent to ${email} from user ${userId}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send invite email. Please try again later.");
  }

  // Increment rate limit counter
  await incrementInviteCount(userId);

  // Log the invite
  await logInvite(userId, email, friendName);

  return true;
}

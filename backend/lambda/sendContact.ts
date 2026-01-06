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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

const DAILY_CONTACT_LIMIT = 3;
const RECAPTCHA_SCORE_THRESHOLD = 0.5;

interface RecaptchaSecrets {
  siteKey: string;
  secretKey: string;
}

interface SendContactArgs {
  name: string;
  email: string;
  subject: string;
  message: string;
  recaptchaToken: string;
}

// Cache secrets for Lambda warm starts
let cachedRecaptchaSecrets: RecaptchaSecrets | null = null;

async function getRecaptchaSecrets(): Promise<RecaptchaSecrets> {
  if (cachedRecaptchaSecrets) return cachedRecaptchaSecrets;

  const response = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: RECAPTCHA_SECRETS_ARN })
  );

  cachedRecaptchaSecrets = JSON.parse(
    response.SecretString!
  ) as RecaptchaSecrets;
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

async function checkRateLimit(email: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  // Normalize email for rate limiting
  const normalizedEmail = email.toLowerCase().trim();

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTACT_LIMIT#${normalizedEmail}`,
        SK: `DATE#${today}`,
      },
    })
  );

  const currentCount = result.Item?.count ?? 0;
  return currentCount < DAILY_CONTACT_LIMIT;
}

async function incrementContactCount(email: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const normalizedEmail = email.toLowerCase().trim();
  const ttl = Math.floor(Date.now() / 1000) + 86400 * 2; // 2 days TTL

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `CONTACT_LIMIT#${normalizedEmail}`,
        SK: `DATE#${today}`,
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

async function logContactSubmission(
  name: string,
  email: string,
  subject: string,
  message: string
): Promise<void> {
  const now = new Date().toISOString();

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: "CONTACT",
        SK: `SUBMISSION#${now}`,
        GSI1PK: "CONTACT",
        GSI1SK: now,
        name,
        email,
        subject,
        message,
        createdAt: now,
        status: "new",
        ttl: Math.floor(Date.now() / 1000) + 86400 * 365, // 1 year TTL
      },
    })
  );
}

function generateEmailHtml(
  name: string,
  email: string,
  subject: string,
  message: string
): string {
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

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
              <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2d3748;">
                    <strong style="color: #a0aec0;">From:</strong>
                    <span style="color: #ffffff; margin-left: 10px;">${name}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2d3748;">
                    <strong style="color: #a0aec0;">Email:</strong>
                    <a href="mailto:${email}" style="color: #667eea; margin-left: 10px; text-decoration: none;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2d3748;">
                    <strong style="color: #a0aec0;">Subject:</strong>
                    <span style="color: #ffffff; margin-left: 10px;">${subject}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 20px 0;">
                    <strong style="color: #a0aec0; display: block; margin-bottom: 10px;">Message:</strong>
                    <div style="color: #e2e8f0; background-color: #0f172a; padding: 20px; border-radius: 8px; line-height: 1.6;">
                      ${escapedMessage}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                This message was sent from the Quiz Night Live contact form.
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
  name: string,
  email: string,
  subject: string,
  message: string
): string {
  return `New Contact Form Submission
============================

From: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}

---
This message was sent from the Quiz Night Live contact form.`;
}

export async function handler(
  event: AppSyncResolverEvent<SendContactArgs>
): Promise<boolean> {
  console.log("SendContact event:", JSON.stringify(event, null, 2));

  const { name, email, subject, message, recaptchaToken } = event.arguments;

  // Validate required fields
  if (!name || !email || !subject || !message) {
    throw new Error("All fields are required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email address");
  }

  // Validate field lengths
  if (name.length > 100) {
    throw new Error("Name is too long");
  }
  if (subject.length > 200) {
    throw new Error("Subject is too long");
  }
  if (message.length > 5000) {
    throw new Error("Message is too long");
  }

  // Verify reCAPTCHA
  const isValidRecaptcha = await verifyRecaptcha(recaptchaToken);
  if (!isValidRecaptcha) {
    console.warn(`reCAPTCHA verification failed for email ${email}`);
    throw new Error("reCAPTCHA verification failed. Please try again.");
  }

  // Check rate limit by email
  const withinLimit = await checkRateLimit(email);
  if (!withinLimit) {
    throw new Error(
      `Daily contact limit reached (${DAILY_CONTACT_LIMIT} per day). Please try again tomorrow.`
    );
  }

  // Send email via SES
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: SES_FROM_EMAIL,
        Destination: {
          ToAddresses: [ADMIN_EMAIL],
        },
        ReplyToAddresses: [email],
        Message: {
          Subject: {
            Data: `[Contact Form] ${subject}`,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: generateEmailHtml(name, email, subject, message),
              Charset: "UTF-8",
            },
            Text: {
              Data: generateEmailText(name, email, subject, message),
              Charset: "UTF-8",
            },
          },
        },
      })
    );

    console.log(`Contact form email sent from ${email}`);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Failed to send message. Please try again later.");
  }

  // Increment rate limit counter
  await incrementContactCount(email);

  // Log the submission
  await logContactSubmission(name, email, subject, message);

  return true;
}

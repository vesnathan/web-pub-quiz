import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const sesClient = new SESClient({});

const TABLE_NAME = process.env.TABLE_NAME!;
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL!;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!;

const DAILY_REPORT_LIMIT = 5;

type ReportReason =
  | "INAPPROPRIATE_AVATAR"
  | "OFFENSIVE_MESSAGE"
  | "HARASSMENT"
  | "SPAM";

type ReportContext = "CHAT_MESSAGE" | "AVATAR" | "PROFILE";

interface ReportUserInput {
  reportedUserId: string;
  reason: ReportReason;
  context: ReportContext;
  description?: string;
  messageContent?: string;
  messageId?: string;
}

interface ReportUserArgs {
  input: ReportUserInput;
}

interface ReporterIdentity {
  sub: string;
}

interface ReportUserEvent {
  arguments: ReportUserArgs;
  identity: ReporterIdentity;
}

const REASON_LABELS: Record<ReportReason, string> = {
  INAPPROPRIATE_AVATAR: "Inappropriate Avatar",
  OFFENSIVE_MESSAGE: "Offensive Message",
  HARASSMENT: "Harassment",
  SPAM: "Spam",
};

const CONTEXT_LABELS: Record<ReportContext, string> = {
  CHAT_MESSAGE: "Chat Message",
  AVATAR: "Avatar",
  PROFILE: "Profile",
};

async function checkRateLimit(reporterId: string): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `REPORT_LIMIT#${reporterId}`,
        SK: `DATE#${today}`,
      },
    }),
  );

  const currentCount = result.Item?.count ?? 0;
  return currentCount < DAILY_REPORT_LIMIT;
}

async function incrementReportCount(reporterId: string): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const ttl = Math.floor(Date.now() / 1000) + 86400 * 2; // 2 days TTL

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `REPORT_LIMIT#${reporterId}`,
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
    }),
  );
}

async function getUserDisplayName(userId: string): Promise<string> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: "PROFILE",
      },
      ProjectionExpression: "displayName",
    }),
  );

  return result.Item?.displayName ?? "Unknown User";
}

async function storeReport(
  reportId: string,
  reporterId: string,
  reporterDisplayName: string,
  reportedUserId: string,
  reportedUserDisplayName: string,
  reason: ReportReason,
  context: ReportContext,
  description?: string,
  messageContent?: string,
  messageId?: string,
): Promise<void> {
  const now = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + 86400 * 90; // 90 days TTL

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `REPORT#${reportId}`,
        SK: "META",
        GSI1PK: "REPORTS",
        GSI1SK: `${now}#${reportId}`,
        GSI2PK: `REPORTED#${reportedUserId}`,
        GSI2SK: now,
        id: reportId,
        reporterId,
        reporterDisplayName,
        reportedUserId,
        reportedUserDisplayName,
        reason,
        context,
        description,
        messageContent,
        messageId,
        status: "pending",
        createdAt: now,
        ttl,
      },
    }),
  );
}

function generateEmailHtml(
  reportId: string,
  reporterDisplayName: string,
  reportedUserDisplayName: string,
  reportedUserId: string,
  reason: ReportReason,
  context: ReportContext,
  description?: string,
  messageContent?: string,
): string {
  const escapeHtml = (str: string) =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

  const descriptionSection = description
    ? `
                <tr>
                  <td style="padding: 20px 0;">
                    <strong style="color: #a0aec0; display: block; margin-bottom: 10px;">Reporter's Description:</strong>
                    <div style="color: #e2e8f0; background-color: #0f172a; padding: 20px; border-radius: 8px; line-height: 1.6;">
                      ${escapeHtml(description)}
                    </div>
                  </td>
                </tr>`
    : "";

  const messageSection = messageContent
    ? `
                <tr>
                  <td style="padding: 20px 0;">
                    <strong style="color: #a0aec0; display: block; margin-bottom: 10px;">Reported Message:</strong>
                    <div style="color: #e2e8f0; background-color: #0f172a; padding: 20px; border-radius: 8px; line-height: 1.6;">
                      ${escapeHtml(messageContent)}
                    </div>
                  </td>
                </tr>`
    : "";

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
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 24px;">User Report Submitted</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2d3748;">
                    <strong style="color: #a0aec0;">Report ID:</strong>
                    <span style="color: #ffffff; margin-left: 10px;">${reportId}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2d3748;">
                    <strong style="color: #a0aec0;">Reported By:</strong>
                    <span style="color: #ffffff; margin-left: 10px;">${reporterDisplayName}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2d3748;">
                    <strong style="color: #a0aec0;">Reported User:</strong>
                    <span style="color: #ffffff; margin-left: 10px;">${reportedUserDisplayName} (${reportedUserId})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2d3748;">
                    <strong style="color: #a0aec0;">Reason:</strong>
                    <span style="color: #ef4444; margin-left: 10px; font-weight: bold;">${REASON_LABELS[reason]}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #2d3748;">
                    <strong style="color: #a0aec0;">Context:</strong>
                    <span style="color: #ffffff; margin-left: 10px;">${CONTEXT_LABELS[context]}</span>
                  </td>
                </tr>
                ${descriptionSection}
                ${messageSection}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 30px; text-align: center;">
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                This report was submitted from Quiz Night Live. Please review and take appropriate action.
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
  reportId: string,
  reporterDisplayName: string,
  reportedUserDisplayName: string,
  reportedUserId: string,
  reason: ReportReason,
  context: ReportContext,
  description?: string,
  messageContent?: string,
): string {
  const descriptionSection = description
    ? `\nReporter's Description:\n${description}\n`
    : "";

  const messageSection = messageContent
    ? `\nReported Message:\n${messageContent}\n`
    : "";

  return `User Report Submitted
============================

Report ID: ${reportId}
Reported By: ${reporterDisplayName}
Reported User: ${reportedUserDisplayName} (${reportedUserId})
Reason: ${REASON_LABELS[reason]}
Context: ${CONTEXT_LABELS[context]}
${descriptionSection}${messageSection}
---
This report was submitted from Quiz Night Live. Please review and take appropriate action.`;
}

export async function handler(
  event: unknown,
): Promise<{ success: boolean; message: string }> {
  console.log("SendUserReport event:", JSON.stringify(event, null, 2));

  // Event is the payload from the AppSync resolver: { arguments, identity }
  const { arguments: args, identity } = event as {
    arguments: ReportUserArgs;
    identity: ReporterIdentity;
  };

  const { input } = args;
  const {
    reportedUserId,
    reason,
    context,
    description,
    messageContent,
    messageId,
  } = input;
  const reporterId = identity.sub;

  // Validate: Cannot report yourself
  if (reportedUserId === reporterId) {
    return { success: false, message: "You cannot report yourself" };
  }

  // Validate reason
  const validReasons: ReportReason[] = [
    "INAPPROPRIATE_AVATAR",
    "OFFENSIVE_MESSAGE",
    "HARASSMENT",
    "SPAM",
  ];
  if (!validReasons.includes(reason)) {
    return { success: false, message: "Invalid report reason" };
  }

  // Validate context
  const validContexts: ReportContext[] = ["CHAT_MESSAGE", "AVATAR", "PROFILE"];
  if (!validContexts.includes(context)) {
    return { success: false, message: "Invalid report context" };
  }

  // Check rate limit
  const withinLimit = await checkRateLimit(reporterId);
  if (!withinLimit) {
    return {
      success: false,
      message: `Daily report limit reached (${DAILY_REPORT_LIMIT} per day). Please try again tomorrow.`,
    };
  }

  // Get display names for both users
  const [reporterDisplayName, reportedUserDisplayName] = await Promise.all([
    getUserDisplayName(reporterId),
    getUserDisplayName(reportedUserId),
  ]);

  // Generate report ID
  const reportId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Store the report
  await storeReport(
    reportId,
    reporterId,
    reporterDisplayName,
    reportedUserId,
    reportedUserDisplayName,
    reason,
    context,
    description,
    messageContent,
    messageId,
  );

  // Send email notification
  try {
    await sesClient.send(
      new SendEmailCommand({
        Source: SES_FROM_EMAIL,
        Destination: {
          ToAddresses: [ADMIN_EMAIL],
        },
        Message: {
          Subject: {
            Data: `[User Report] ${REASON_LABELS[reason]} - ${reportedUserDisplayName}`,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: generateEmailHtml(
                reportId,
                reporterDisplayName,
                reportedUserDisplayName,
                reportedUserId,
                reason,
                context,
                description,
                messageContent,
              ),
              Charset: "UTF-8",
            },
            Text: {
              Data: generateEmailText(
                reportId,
                reporterDisplayName,
                reportedUserDisplayName,
                reportedUserId,
                reason,
                context,
                description,
                messageContent,
              ),
              Charset: "UTF-8",
            },
          },
        },
      }),
    );

    console.log(`User report email sent for report ${reportId}`);
  } catch (error) {
    console.error("Failed to send report email:", error);
    // Don't fail the report if email fails - report is already stored
  }

  // Increment rate limit counter
  await incrementReportCount(reporterId);

  return { success: true, message: "Report submitted successfully" };
}

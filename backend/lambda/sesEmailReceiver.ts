import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SSMClient, PutParameterCommand } from "@aws-sdk/client-ssm";
import type { SESEvent, SESHandler } from "aws-lambda";
import { simpleParser } from "mailparser";
import { Readable } from "stream";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
});
const ssmClient = new SSMClient({
  region: process.env.SSM_REGION || "ap-southeast-2",
});

const S3_BUCKET = process.env.EMAIL_BUCKET || "";
const STAGE = process.env.STAGE || "prod";

/**
 * SES Email Receiver Lambda
 *
 * Receives emails from SES, extracts Cognito verification codes,
 * and stores them in SSM Parameter Store for E2E tests.
 *
 * Expected email format from Cognito:
 * - Subject contains "verification code" or similar
 * - Body contains 6-digit code
 */
export const handler: SESHandler = async (event: SESEvent) => {
  console.log("SES Email Receiver:", JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const sesMessage = record.ses;
    const messageId = sesMessage.mail.messageId;
    const recipients = sesMessage.mail.destination;
    const source = sesMessage.mail.source;

    // Get From header and Subject from commonHeaders
    const fromHeader = sesMessage.mail.commonHeaders?.from?.[0] || "";
    const subject = sesMessage.mail.commonHeaders?.subject || "";

    console.log(
      `Processing email ${messageId} from ${fromHeader} (envelope: ${source}) to ${recipients.join(", ")}`,
    );
    console.log(`Subject: ${subject}`);

    // Only process emails from Cognito (no-reply@verificationemail.com or similar)
    // Check the From header (not envelope sender) and subject
    const isVerificationEmail =
      fromHeader.includes("verificationemail.com") ||
      fromHeader.includes("no-reply") ||
      subject.toLowerCase().includes("verification code");

    if (!isVerificationEmail) {
      console.log("Skipping non-Cognito email");
      continue;
    }

    try {
      // Fetch email from S3
      const s3Response = await s3Client.send(
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: messageId,
        }),
      );

      if (!s3Response.Body) {
        console.error("No email body found in S3");
        continue;
      }

      // Parse email
      const emailContent = await streamToString(s3Response.Body as Readable);
      const parsed = await simpleParser(emailContent);

      console.log("Email subject:", parsed.subject);
      console.log("Email text:", parsed.text?.substring(0, 500));

      // Extract verification code (6 digits)
      const codeMatch = parsed.text?.match(/\b(\d{6})\b/);
      if (!codeMatch) {
        console.log("No 6-digit code found in email");
        continue;
      }

      const verificationCode = codeMatch[1];
      console.log(`Found verification code: ${verificationCode}`);

      // Store code in SSM for each recipient
      for (const recipient of recipients) {
        // Only process e2e test emails
        if (
          !recipient.includes("+e2e") ||
          !recipient.endsWith("@quiznight.live")
        ) {
          console.log(`Skipping non-E2E recipient: ${recipient}`);
          continue;
        }

        // Sanitize email for SSM parameter name
        const sanitizedEmail = recipient
          .toLowerCase()
          .replace(/\+/g, "-plus-")
          .replace(/@/g, "-at-")
          .replace(/\./g, "-");

        const paramName = `/quiz/${STAGE}/e2e/codes/${sanitizedEmail}/verification`;

        await ssmClient.send(
          new PutParameterCommand({
            Name: paramName,
            Value: JSON.stringify({
              code: verificationCode,
              email: recipient.toLowerCase(),
              source,
              receivedAt: new Date().toISOString(),
            }),
            Type: "SecureString",
            Overwrite: true,
          }),
        );

        console.log(`Stored verification code in SSM: ${paramName}`);
      }
    } catch (error) {
      console.error("Error processing email:", error);
    }
  }
};

async function streamToString(stream: Readable): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf-8");
}

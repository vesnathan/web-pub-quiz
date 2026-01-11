import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.sendAdminMessage
 *
 * Sends a direct message from admin to a user.
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/notifications/Mutations
 */

type SendAdminMessageInput = {
  toUserId: string;
  subject: string;
  content: string;
  relatedReportId?: string;
};

type Args = {
  input: SendAdminMessageInput;
};

/**
 * Request function - stores admin message in DynamoDB.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can send admin messages",
      "UnauthorizedException",
    );
  }

  const { input } = ctx.arguments;
  const { toUserId, subject, content, relatedReportId } = input;

  // Validate input
  if (!subject || subject.trim().length === 0) {
    return util.error("Subject is required", "ValidationError");
  }
  if (!content || content.trim().length === 0) {
    return util.error("Content is required", "ValidationError");
  }

  const messageId = util.autoId();
  const now = util.time.nowISO8601();
  const ttl = util.time.nowEpochSeconds() + 86400 * 90; // 90 days TTL

  return {
    operation: "PutItem",
    key: util.dynamodb.toMapValues({
      PK: `NOTIFICATION#${messageId}`,
      SK: "META",
    }),
    attributeValues: util.dynamodb.toMapValues({
      GSI1PK: `USER_NOTIFICATIONS#${toUserId}`,
      GSI1SK: `${now}#${messageId}`,
      id: messageId,
      fromAdminId: identity.sub,
      toUserId: toUserId,
      subject: subject.trim(),
      content: content.trim(),
      relatedReportId: relatedReportId || null,
      read: false,
      createdAt: now,
      ttl: ttl,
    }),
  };
}

/**
 * Response function - returns created message.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const item = ctx.result;
  return {
    id: item.id,
    fromAdminId: item.fromAdminId,
    toUserId: item.toUserId,
    subject: item.subject,
    content: item.content,
    relatedReportId: item.relatedReportId || null,
    read: item.read,
    createdAt: item.createdAt,
  };
}

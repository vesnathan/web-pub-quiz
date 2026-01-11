import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getMyNotifications
 *
 * Retrieves notifications for the current user.
 *
 * @module resolvers/notifications/Queries
 */

type Args = {
  limit?: number;
  nextToken?: string;
};

/**
 * Request function - queries user's notifications from DynamoDB.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const userId = identity.sub;

  const { limit, nextToken } = ctx.arguments;
  const queryLimit = limit || 20;

  return {
    operation: "Query",
    index: "GSI1",
    query: {
      expression: "GSI1PK = :pk",
      expressionValues: util.dynamodb.toMapValues({
        ":pk": `USER_NOTIFICATIONS#${userId}`,
      }),
    },
    scanIndexForward: false, // Most recent first
    limit: queryLimit,
    nextToken: nextToken || null,
  };
}

/**
 * Response function - transforms DynamoDB items to AdminMessage type.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items || [];
  const notifications: Array<{
    id: string;
    fromAdminId: string;
    toUserId: string;
    subject: string;
    content: string;
    relatedReportId: string | null;
    read: boolean;
    createdAt: string;
  }> = [];

  for (const item of items) {
    notifications.push({
      id: item.id,
      fromAdminId: item.fromAdminId,
      toUserId: item.toUserId,
      subject: item.subject,
      content: item.content,
      relatedReportId: item.relatedReportId || null,
      read: item.read || false,
      createdAt: item.createdAt,
    });
  }

  return {
    items: notifications,
    nextToken: ctx.result.nextToken || null,
  };
}

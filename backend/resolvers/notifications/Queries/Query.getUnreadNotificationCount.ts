import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getUnreadNotificationCount
 *
 * Returns count of unread notifications for the current user.
 *
 * @module resolvers/notifications/Queries
 */

type Args = Record<string, never>;

/**
 * Request function - queries user's unread notifications from DynamoDB.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const userId = identity.sub;

  return {
    operation: "Query",
    index: "GSI1",
    query: {
      expression: "GSI1PK = :pk",
      expressionValues: util.dynamodb.toMapValues({
        ":pk": `USER_NOTIFICATIONS#${userId}`,
      }),
    },
    filter: {
      expression: "#read = :unread",
      expressionNames: {
        "#read": "read",
      },
      expressionValues: util.dynamodb.toMapValues({
        ":unread": false,
      }),
    },
    select: "COUNT",
  };
}

/**
 * Response function - returns count.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  return ctx.result.scannedCount || 0;
}

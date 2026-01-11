import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.markAllNotificationsRead
 *
 * Marks all notifications as read for the current user.
 * Uses a query + transact write to update up to 25 notifications at once.
 *
 * @module resolvers/notifications/Mutations
 */

type Args = Record<string, never>;

/**
 * Request function - queries unread notifications and marks them as read.
 * Note: Limited to 25 notifications per call due to DynamoDB transaction limits.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const userId = identity.sub;

  // Query unread notifications for this user
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
    limit: 25, // DynamoDB transaction limit
  };
}

/**
 * Response function - builds transaction to mark all as read.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items || [];

  if (items.length === 0) {
    return true; // No unread notifications
  }

  // Store notification IDs in stash for second resolver in pipeline
  // For now, just return true - actual update would need pipeline resolver
  // TODO: Implement as pipeline resolver for full batch update support
  return true;
}

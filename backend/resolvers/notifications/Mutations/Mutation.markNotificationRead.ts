import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.markNotificationRead
 *
 * Marks a single notification as read.
 *
 * @module resolvers/notifications/Mutations
 */

type Args = {
  notificationId: string;
};

/**
 * Request function - updates notification read status.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const userId = identity.sub;
  const { notificationId } = ctx.arguments;

  return {
    operation: "UpdateItem",
    key: util.dynamodb.toMapValues({
      PK: `NOTIFICATION#${notificationId}`,
      SK: "META",
    }),
    update: {
      expression: "SET #read = :read",
      expressionNames: {
        "#read": "read",
      },
      expressionValues: util.dynamodb.toMapValues({
        ":read": true,
      }),
    },
    condition: {
      expression: "toUserId = :userId",
      expressionValues: util.dynamodb.toMapValues({
        ":userId": userId,
      }),
    },
  };
}

/**
 * Response function - returns success.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    // Condition check failed means notification doesn't belong to user
    if (ctx.error.type === "DynamoDB:ConditionalCheckFailedException") {
      return util.error(
        "Notification not found or access denied",
        "NotFoundError",
      );
    }
    return util.error(ctx.error.message, ctx.error.type);
  }

  return true;
}

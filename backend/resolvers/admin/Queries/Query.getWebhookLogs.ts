import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getWebhookLogs
 *
 * Retrieves webhook logs for admin users.
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/admin/Queries
 */

type Args = {
  provider?: string;
  limit?: number;
  nextToken?: string;
};

/**
 * Request function - queries webhook logs from DynamoDB.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can view webhook logs",
      "UnauthorizedException"
    );
  }

  const { provider, limit, nextToken } = ctx.arguments;
  const queryLimit = limit || 50;

  // If provider specified, query by provider
  if (provider) {
    const gsi1pk = `WEBHOOK_LOG#${provider.toUpperCase()}`;
    return {
      operation: "Query",
      index: "GSI1",
      query: {
        expression: "GSI1PK = :pk",
        expressionValues: util.dynamodb.toMapValues({
          ":pk": gsi1pk,
        }),
      },
      scanIndexForward: false, // Most recent first
      limit: queryLimit,
      nextToken: nextToken || null,
    };
  }

  // Query all webhook logs (by PK)
  return {
    operation: "Query",
    query: {
      expression: "PK = :pk",
      expressionValues: util.dynamodb.toMapValues({
        ":pk": "WEBHOOK_LOG",
      }),
    },
    scanIndexForward: false, // Most recent first
    limit: queryLimit,
    nextToken: nextToken || null,
  };
}

/**
 * Response function - transforms DynamoDB items to WebhookLog type.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items || [];
  const webhookLogs: Array<{
    eventId: string;
    provider: string;
    eventType: string;
    payload: string;
    status: string;
    errorMessage: string | null;
    createdAt: string;
  }> = [];

  for (const item of items) {
    webhookLogs.push({
      eventId: item.eventId,
      provider: item.provider,
      eventType: item.eventType,
      payload: item.payload,
      status: item.status,
      errorMessage: item.errorMessage || null,
      createdAt: item.createdAt,
    });
  }

  return {
    items: webhookLogs,
    nextToken: ctx.result.nextToken || null,
  };
}

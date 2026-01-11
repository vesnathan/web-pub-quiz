import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Query.getReports
 *
 * Retrieves user reports for admin users.
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/report/Queries
 */

type Args = {
  status?: string;
  limit?: number;
  nextToken?: string;
};

/**
 * Request function - queries reports from DynamoDB.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can view reports",
      "UnauthorizedException",
    );
  }

  const { status, limit, nextToken } = ctx.arguments;
  const queryLimit = limit || 50;

  // Query all reports via GSI1 (sorted by date)
  const baseQuery = {
    operation: "Query",
    index: "GSI1",
    query: {
      expression: "GSI1PK = :pk",
      expressionValues: util.dynamodb.toMapValues({
        ":pk": "REPORTS",
      }),
    },
    scanIndexForward: false, // Most recent first
    limit: queryLimit,
    nextToken: nextToken || null,
  };

  // If status filter is specified, add filter expression
  if (status) {
    return {
      operation: "Query",
      index: "GSI1",
      query: {
        expression: "GSI1PK = :pk",
        expressionValues: util.dynamodb.toMapValues({
          ":pk": "REPORTS",
        }),
      },
      filter: {
        expression: "#status = :status",
        expressionNames: {
          "#status": "status",
        },
        expressionValues: util.dynamodb.toMapValues({
          ":status": status.toLowerCase(),
        }),
      },
      scanIndexForward: false,
      limit: queryLimit,
      nextToken: nextToken || null,
    };
  }

  return baseQuery;
}

/**
 * Response function - transforms DynamoDB items to Report type.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const items = ctx.result.items || [];
  const reports: Array<{
    id: string;
    reporterId: string;
    reporterDisplayName: string;
    reportedUserId: string;
    reportedUserDisplayName: string;
    reason: string;
    context: string;
    description: string | null;
    messageContent: string | null;
    messageId: string | null;
    status: string;
    createdAt: string;
    adminNotes: string | null;
    resolvedAt: string | null;
    resolvedBy: string | null;
  }> = [];

  for (const item of items) {
    reports.push({
      id: item.id,
      reporterId: item.reporterId,
      reporterDisplayName: item.reporterDisplayName,
      reportedUserId: item.reportedUserId,
      reportedUserDisplayName: item.reportedUserDisplayName,
      reason: item.reason,
      context: item.context,
      description: item.description || null,
      messageContent: item.messageContent || null,
      messageId: item.messageId || null,
      status: item.status ? item.status.toUpperCase() : "PENDING",
      createdAt: item.createdAt,
      adminNotes: item.adminNotes || null,
      resolvedAt: item.resolvedAt || null,
      resolvedBy: item.resolvedBy || null,
    });
  }

  return {
    items: reports,
    nextToken: ctx.result.nextToken || null,
  };
}

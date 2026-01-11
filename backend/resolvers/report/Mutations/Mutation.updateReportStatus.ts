import { util, Context, AppSyncIdentityCognito } from "@aws-appsync/utils";

/**
 * GraphQL resolver: Mutation.updateReportStatus
 *
 * Updates the status of a user report.
 * Restricted to users in the SiteAdmin Cognito group.
 *
 * @module resolvers/report/Mutations
 */

type UpdateReportStatusInput = {
  reportId: string;
  status: string;
  adminNotes?: string;
};

type Args = {
  input: UpdateReportStatusInput;
};

/**
 * Request function - updates report status in DynamoDB.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as AppSyncIdentityCognito;
  const groups = identity.groups || [];

  // Verify user is admin
  if (groups.indexOf("SiteAdmin") === -1) {
    return util.error(
      "Unauthorized: Only site administrators can update report status",
      "UnauthorizedException",
    );
  }

  const { input } = ctx.arguments;
  const { reportId, status, adminNotes } = input;
  const now = util.time.nowISO8601();

  // Validate status
  const validStatuses = ["PENDING", "REVIEWED", "ACTIONED", "DISMISSED"];
  if (validStatuses.indexOf(status) === -1) {
    return util.error(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      "ValidationError",
    );
  }

  const updateExpression = [
    "#status = :status",
    "resolvedAt = :resolvedAt",
    "resolvedBy = :resolvedBy",
  ];
  const expressionValues: Record<string, unknown> = {
    ":status": status.toLowerCase(),
    ":resolvedAt": now,
    ":resolvedBy": identity.sub,
  };

  if (adminNotes !== undefined) {
    updateExpression.push("adminNotes = :adminNotes");
    expressionValues[":adminNotes"] = adminNotes;
  }

  return {
    operation: "UpdateItem",
    key: util.dynamodb.toMapValues({
      PK: `REPORT#${reportId}`,
      SK: "META",
    }),
    update: {
      expression: `SET ${updateExpression.join(", ")}`,
      expressionNames: {
        "#status": "status",
      },
      expressionValues: util.dynamodb.toMapValues(expressionValues),
    },
  };
}

/**
 * Response function - returns updated report.
 */
export function response(ctx: Context<Args>) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const item = ctx.result;
  if (!item) {
    return util.error("Report not found", "NotFoundError");
  }

  return {
    id: item.id,
    reporterId: item.reporterId,
    reporterDisplayName: item.reporterDisplayName,
    reportedUserId: item.reportedUserId,
    reportedUserDisplayName: item.reportedUserDisplayName,
    reason: item.reason,
    context: item.context,
    messageContent: item.messageContent || null,
    messageId: item.messageId || null,
    status: item.status ? item.status.toUpperCase() : "PENDING",
    createdAt: item.createdAt,
    adminNotes: item.adminNotes || null,
    resolvedAt: item.resolvedAt || null,
    resolvedBy: item.resolvedBy || null,
  };
}

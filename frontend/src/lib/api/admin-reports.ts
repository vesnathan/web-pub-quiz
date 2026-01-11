/**
 * Admin Reports API functions
 * Wraps GraphQL operations for report management
 */
import { graphqlClient } from "@/lib/graphql";
import { GET_REPORTS, GET_USER_MODERATION } from "@/graphql/queries";
import {
  UPDATE_REPORT_STATUS,
  SEND_ADMIN_MESSAGE,
  ADD_STRIKE,
  BAN_USER,
  UNBAN_USER,
} from "@/graphql/mutations";

export type ReportStatus = "PENDING" | "REVIEWED" | "ACTIONED" | "DISMISSED";
export type ReportReason =
  | "INAPPROPRIATE_AVATAR"
  | "OFFENSIVE_MESSAGE"
  | "HARASSMENT"
  | "SPAM";
export type ReportContext = "CHAT_MESSAGE" | "AVATAR" | "PROFILE";

export interface Report {
  id: string;
  reporterId: string;
  reporterDisplayName: string;
  reportedUserId: string;
  reportedUserDisplayName: string;
  reason: ReportReason;
  context: ReportContext;
  description: string | null;
  messageContent: string | null;
  messageId: string | null;
  status: ReportStatus;
  createdAt: string;
  adminNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface ReportConnection {
  items: Report[];
  nextToken: string | null;
}

export interface AdminMessage {
  id: string;
  fromAdminId: string;
  toUserId: string;
  subject: string;
  content: string;
  relatedReportId: string | null;
  read: boolean;
  createdAt: string;
}

interface GetReportsResponse {
  data?: {
    getReports?: ReportConnection;
  };
  errors?: Array<{ message: string }>;
}

interface UpdateReportStatusResponse {
  data?: {
    updateReportStatus?: Report;
  };
  errors?: Array<{ message: string }>;
}

interface SendAdminMessageResponse {
  data?: {
    sendAdminMessage?: AdminMessage;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Get reports (admin only)
 */
export async function getReports(
  status?: ReportStatus,
  limit?: number,
  nextToken?: string,
): Promise<ReportConnection> {
  const result = (await graphqlClient.graphql({
    query: GET_REPORTS,
    variables: { status, limit, nextToken },
  })) as GetReportsResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.getReports ?? { items: [], nextToken: null };
}

/**
 * Update report status (admin only)
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  adminNotes?: string,
): Promise<Report | null> {
  const result = (await graphqlClient.graphql({
    query: UPDATE_REPORT_STATUS,
    variables: {
      input: { reportId, status, adminNotes },
    },
  })) as UpdateReportStatusResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.updateReportStatus ?? null;
}

/**
 * Send admin message to user (admin only)
 */
export async function sendAdminMessage(
  toUserId: string,
  subject: string,
  content: string,
  relatedReportId?: string,
): Promise<AdminMessage | null> {
  const result = (await graphqlClient.graphql({
    query: SEND_ADMIN_MESSAGE,
    variables: {
      input: { toUserId, subject, content, relatedReportId },
    },
  })) as SendAdminMessageResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.sendAdminMessage ?? null;
}

// Moderation types and functions

export interface Strike {
  id: string;
  reason: string;
  relatedReportId: string | null;
  issuedBy: string;
  issuedAt: string;
  expiresAt: string | null;
}

export interface UserModeration {
  userId: string;
  displayName: string;
  strikes: Strike[];
  strikeCount: number;
  isBanned: boolean;
  bannedAt: string | null;
  bannedReason: string | null;
  bannedBy: string | null;
}

export interface ModerationResult {
  success: boolean;
  message: string | null;
  moderation: UserModeration | null;
}

interface GetUserModerationResponse {
  data?: {
    getUserModeration?: UserModeration;
  };
  errors?: Array<{ message: string }>;
}

interface ModerationMutationResponse {
  data?: {
    addStrike?: ModerationResult;
    banUser?: ModerationResult;
    unbanUser?: ModerationResult;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Get user moderation status (admin only)
 */
export async function getUserModeration(
  userId: string,
): Promise<UserModeration | null> {
  const result = (await graphqlClient.graphql({
    query: GET_USER_MODERATION,
    variables: { userId },
  })) as GetUserModerationResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.getUserModeration ?? null;
}

/**
 * Add strike to user (admin only)
 */
export async function addStrike(
  userId: string,
  reason: string,
  relatedReportId?: string,
  expiresInDays?: number,
): Promise<ModerationResult> {
  const result = (await graphqlClient.graphql({
    query: ADD_STRIKE,
    variables: {
      input: { userId, reason, relatedReportId, expiresInDays },
    },
  })) as ModerationMutationResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return (
    result.data?.addStrike ?? {
      success: false,
      message: "Unknown error",
      moderation: null,
    }
  );
}

/**
 * Ban user (admin only)
 */
export async function banUser(
  userId: string,
  reason: string,
  relatedReportId?: string,
  deleteAccount?: boolean,
): Promise<ModerationResult> {
  const result = (await graphqlClient.graphql({
    query: BAN_USER,
    variables: {
      input: { userId, reason, relatedReportId, deleteAccount },
    },
  })) as ModerationMutationResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return (
    result.data?.banUser ?? {
      success: false,
      message: "Unknown error",
      moderation: null,
    }
  );
}

/**
 * Unban user (admin only)
 */
export async function unbanUser(userId: string): Promise<ModerationResult> {
  const result = (await graphqlClient.graphql({
    query: UNBAN_USER,
    variables: { userId },
  })) as ModerationMutationResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return (
    result.data?.unbanUser ?? {
      success: false,
      message: "Unknown error",
      moderation: null,
    }
  );
}

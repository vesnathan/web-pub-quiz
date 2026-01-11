/**
 * Notifications API functions
 * Wraps GraphQL operations for user notifications
 */
import { graphqlClient } from "@/lib/graphql";
import {
  GET_MY_NOTIFICATIONS,
  GET_UNREAD_NOTIFICATION_COUNT,
} from "@/graphql/queries";
import {
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from "@/graphql/mutations";

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

export interface NotificationConnection {
  items: AdminMessage[];
  nextToken: string | null;
}

interface GetNotificationsResponse {
  data?: {
    getMyNotifications?: NotificationConnection;
  };
  errors?: Array<{ message: string }>;
}

interface GetUnreadCountResponse {
  data?: {
    getUnreadNotificationCount?: number;
  };
  errors?: Array<{ message: string }>;
}

interface MarkReadResponse {
  data?: {
    markNotificationRead?: boolean;
    markAllNotificationsRead?: boolean;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Get user's notifications
 */
export async function getMyNotifications(
  limit?: number,
  nextToken?: string,
): Promise<NotificationConnection> {
  const result = (await graphqlClient.graphql({
    query: GET_MY_NOTIFICATIONS,
    variables: { limit, nextToken },
  })) as GetNotificationsResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.getMyNotifications ?? { items: [], nextToken: null };
}

/**
 * Get count of unread notifications
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const result = (await graphqlClient.graphql({
    query: GET_UNREAD_NOTIFICATION_COUNT,
  })) as GetUnreadCountResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.getUnreadNotificationCount ?? 0;
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<boolean> {
  const result = (await graphqlClient.graphql({
    query: MARK_NOTIFICATION_READ,
    variables: { notificationId },
  })) as MarkReadResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.markNotificationRead ?? false;
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<boolean> {
  const result = (await graphqlClient.graphql({
    query: MARK_ALL_NOTIFICATIONS_READ,
  })) as MarkReadResponse;

  if (result.errors?.length) {
    throw new Error(result.errors[0].message);
  }

  return result.data?.markAllNotificationsRead ?? false;
}

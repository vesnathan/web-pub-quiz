"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Chip,
} from "@nextui-org/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { LoadingScreen, LoadingDots } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type AdminMessage,
} from "@/lib/api/notifications";

export default function NotificationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const {
    data: notificationsData,
    isLoading: notificationsLoading,
    refetch,
  } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => getMyNotifications(50),
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount"] });
    },
  });

  const handleMarkRead = useCallback(
    (notificationId: string) => {
      markReadMutation.mutate(notificationId);
    },
    [markReadMutation],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    router.push("/");
    return null;
  }

  const notifications = notificationsData?.items || [];
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Notifications
          </h1>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="flat"
                onPress={handleMarkAllRead}
                isLoading={markAllReadMutation.isPending}
              >
                Mark All Read
              </Button>
            )}
            <Button
              variant="light"
              onPress={() => router.push("/")}
              className="text-gray-400"
            >
              Back to Home
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <Card className="bg-gray-800/50">
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">
              Messages from Admin
              {unreadCount > 0 && (
                <Chip color="danger" size="sm" variant="flat" className="ml-2">
                  {unreadCount} unread
                </Chip>
              )}
            </h2>
            <Button
              size="sm"
              variant="flat"
              onPress={() => refetch()}
              isLoading={notificationsLoading}
            >
              Refresh
            </Button>
          </CardHeader>
          <Divider />
          <CardBody>
            {notificationsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingDots />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No notifications yet.
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    isMarking={markReadMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

interface NotificationCardProps {
  notification: AdminMessage;
  onMarkRead: (id: string) => void;
  isMarking: boolean;
}

function NotificationCard({
  notification,
  onMarkRead,
  isMarking,
}: NotificationCardProps) {
  return (
    <div
      className={`rounded-lg p-4 ${
        notification.read
          ? "bg-gray-700/20"
          : "bg-gray-700/50 border-l-4 border-primary-500"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {!notification.read && (
              <span className="w-2 h-2 bg-primary-500 rounded-full" />
            )}
            <span className="font-semibold text-white">
              {notification.subject}
            </span>
          </div>
          <div className="text-gray-300 text-sm whitespace-pre-wrap">
            {notification.content}
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {new Date(notification.createdAt).toLocaleString()}
          </div>
        </div>
        {!notification.read && (
          <Button
            size="sm"
            variant="flat"
            onPress={() => onMarkRead(notification.id)}
            isLoading={isMarking}
          >
            Mark Read
          </Button>
        )}
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { Button, Badge } from "@nextui-org/react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getUnreadNotificationCount } from "@/lib/api/notifications";

export function NotificationBell() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unreadNotificationCount"],
    queryFn: getUnreadNotificationCount,
    enabled: isAuthenticated,
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
  });

  if (!isAuthenticated) return null;

  return (
    <Badge
      content={
        unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : null
      }
      color="danger"
      size="sm"
      shape="circle"
      isInvisible={unreadCount === 0}
    >
      <Button
        isIconOnly
        variant="light"
        onPress={() => router.push("/notifications")}
        className="text-gray-400 hover:text-white"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </Button>
    </Badge>
  );
}

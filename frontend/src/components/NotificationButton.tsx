"use client";

import { Button } from "@nextui-org/react";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationButton() {
  const {
    notificationsEnabled,
    permissionState,
    requestPermission,
    disableNotifications,
    enableNotifications,
  } = useNotifications();

  if (permissionState === "unsupported") {
    return null;
  }

  if (permissionState === "denied") {
    return <span className="text-xs text-gray-500">Notifications blocked</span>;
  }

  if (permissionState === "granted" || permissionState === "mobile") {
    return (
      <Button
        size="sm"
        variant="light"
        onPress={
          notificationsEnabled ? disableNotifications : enableNotifications
        }
        className="text-sm text-gray-400 hover:text-white min-w-0 px-2"
      >
        {notificationsEnabled
          ? permissionState === "mobile"
            ? "🔔 Alerts on"
            : "🔔 Notifications on"
          : permissionState === "mobile"
            ? "🔕 Alerts off"
            : "🔕 Notifications off"}
      </Button>
    );
  }

  // Default state - permission not yet requested
  return (
    <Button
      size="sm"
      variant="light"
      onPress={requestPermission}
      className="text-sm text-gray-400 hover:text-white min-w-0 px-2"
    >
      🔔 Enable alerts
    </Button>
  );
}

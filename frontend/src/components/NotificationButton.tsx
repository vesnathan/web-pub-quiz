"use client";

import { Button, Chip } from "@nextui-org/react";
import { useNotifications } from "@/hooks/useNotifications";

export function NotificationButton() {
  const { permissionState, requestPermission } = useNotifications();

  if (permissionState === "unsupported") {
    return null;
  }

  if (permissionState === "granted") {
    return (
      <Chip size="sm" color="success" variant="flat">
        🔔 Notifications on
      </Chip>
    );
  }

  if (permissionState === "denied") {
    return (
      <Chip size="sm" color="default" variant="flat">
        🔕 Notifications blocked
      </Chip>
    );
  }

  return (
    <Button size="sm" variant="flat" onPress={requestPermission}>
      🔔 Enable notifications
    </Button>
  );
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// Notification thresholds in seconds
const NOTIFY_AT = [60, 30, 10]; // 1 minute, 30 seconds, 10 seconds before

export function useNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | "unsupported"
  >("default");

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionState(Notification.permission);
      setNotificationsEnabled(Notification.permission === "granted");
    } else {
      setPermissionState("unsupported");
    }
  }, []);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;

    const permission = await Notification.requestPermission();
    setPermissionState(permission);
    setNotificationsEnabled(permission === "granted");
  }, []);

  // Disable notifications (user opt-out, permission stays granted)
  const disableNotifications = useCallback(() => {
    setNotificationsEnabled(false);
  }, []);

  // Re-enable notifications (if permission is still granted)
  const enableNotifications = useCallback(() => {
    if (permissionState === "granted") {
      setNotificationsEnabled(true);
    }
  }, [permissionState]);

  // Send notification
  const sendNotification = useCallback(
    (title: string, body: string) => {
      if (!notificationsEnabled || Notification.permission !== "granted")
        return;

      const notification = new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "quiz-notification",
        requireInteraction: false,
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    },
    [notificationsEnabled],
  );

  return {
    notificationsEnabled,
    permissionState,
    requestPermission,
    disableNotifications,
    enableNotifications,
    sendNotification,
  };
}

export function useCountdownNotifications(
  targetTime: number,
  isActive: boolean,
  notificationsEnabled: boolean,
  sendNotification: (title: string, body: string) => void,
) {
  const notifiedRef = useRef<Set<number>>(new Set());

  // Reset notified set when target time changes
  useEffect(() => {
    notifiedRef.current = new Set();
  }, [targetTime]);

  // Check and send notifications based on countdown
  const checkNotifications = useCallback(
    (diff: number) => {
      if (!notificationsEnabled || isActive) return;

      const totalSeconds = Math.floor(diff / 1000);

      if (diff <= 0) {
        if (!notifiedRef.current.has(0)) {
          notifiedRef.current.add(0);
          sendNotification("Quiz Starting!", "The quiz set is starting now!");
        }
        return;
      }

      for (const threshold of NOTIFY_AT) {
        if (totalSeconds <= threshold && !notifiedRef.current.has(threshold)) {
          notifiedRef.current.add(threshold);
          const timeText =
            threshold >= 60
              ? `${Math.floor(threshold / 60)} minute${threshold >= 120 ? "s" : ""}`
              : `${threshold} seconds`;
          sendNotification(
            "Quiz Starting Soon!",
            `The next quiz set starts in ${timeText}!`,
          );
          break;
        }
      }
    },
    [notificationsEnabled, isActive, sendNotification],
  );

  return { checkNotifications };
}

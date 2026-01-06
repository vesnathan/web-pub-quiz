"use client";

import { useEffect, useState, useCallback, useRef } from "react";

// Notification thresholds in seconds
const NOTIFY_AT = [60, 30, 10]; // 1 minute, 30 seconds, 10 seconds before

// Check if we're on a mobile device
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
}

// Check if iOS (notifications not supported)
function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

// Play a notification sound using Web Audio API
function playNotificationSound() {
  try {
    const audioContext = new (
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    )();

    // Create a simple "ding" sound
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);

    // Play a second tone for a "ding-ding" effect
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();

      osc2.connect(gain2);
      gain2.connect(audioContext.destination);

      osc2.frequency.setValueAtTime(1100, audioContext.currentTime); // C#6 note
      osc2.type = "sine";

      gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain2.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5,
      );

      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.5);
    }, 150);
  } catch {
    // Web Audio API not supported
  }
}

export function useNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [permissionState, setPermissionState] = useState<
    NotificationPermission | "unsupported" | "mobile"
  >("default");

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    // iOS doesn't support web notifications
    if (isIOS()) {
      setPermissionState("mobile");
      return;
    }

    if ("Notification" in window) {
      setPermissionState(Notification.permission);
      setNotificationsEnabled(Notification.permission === "granted");
    } else {
      setPermissionState("unsupported");
    }
  }, []);

  // Request notification permission (or enable sound alerts on mobile)
  const requestPermission = useCallback(async () => {
    // On iOS/mobile, just enable sound alerts
    if (isIOS() || !("Notification" in window)) {
      setNotificationsEnabled(true);
      setPermissionState("mobile");
      // Play a test sound to confirm it works (requires user interaction)
      playNotificationSound();
      return;
    }

    const permission = await Notification.requestPermission();
    setPermissionState(permission);
    setNotificationsEnabled(permission === "granted");
  }, []);

  // Disable notifications (user opt-out, permission stays granted)
  const disableNotifications = useCallback(() => {
    setNotificationsEnabled(false);
  }, []);

  // Re-enable notifications (if permission is still granted or on mobile)
  const enableNotifications = useCallback(() => {
    if (permissionState === "granted" || permissionState === "mobile") {
      setNotificationsEnabled(true);
    }
  }, [permissionState]);

  // Send notification (with audio fallback for mobile)
  const sendNotification = useCallback(
    (title: string, body: string) => {
      if (!notificationsEnabled) return;

      // Try native notification first (desktop)
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          const notification = new Notification(title, {
            body,
            icon: "/favicon.ico",
            tag: "quiz-notification",
            requireInteraction: false,
          });
          setTimeout(() => notification.close(), 5000);
        } catch {
          // Notification failed (e.g., mobile)
        }
      }

      // Play sound alert (works on mobile when tab is active)
      playNotificationSound();

      // Vibrate on mobile if supported
      if (isMobileDevice() && "vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
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
    isMobile: isMobileDevice(),
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

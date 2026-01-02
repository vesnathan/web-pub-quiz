"use client";

import { useEffect, useState } from "react";
import { Button } from "@nextui-org/react";
import {
  useNotifications,
  useCountdownNotifications,
} from "@/hooks/useNotifications";
import { useGameStore } from "@/stores/gameStore";
import { DID_YOU_KNOW_FACTS } from "@/data/didYouKnowFacts";

interface CountdownTimerProps {
  targetTime: number;
  isActive: boolean;
}

export function CountdownTimer({ targetTime, isActive }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  // Start with a random fact
  const [factIndex, setFactIndex] = useState(() =>
    Math.floor(Math.random() * DID_YOU_KNOW_FACTS.length),
  );
  const [factFading, setFactFading] = useState(false);
  const updateSetTiming = useGameStore((state) => state.updateSetTiming);
  const questionIndex = useGameStore((state) => state.questionIndex);
  const totalQuestions = useGameStore((state) => state.totalQuestions);

  // Rotate facts every 12 seconds when set is active
  useEffect(() => {
    if (!isActive) return;

    const rotateFact = () => {
      setFactFading(true);
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % DID_YOU_KNOW_FACTS.length);
        setFactFading(false);
      }, 300);
    };

    const interval = setInterval(rotateFact, 12000);
    return () => clearInterval(interval);
  }, [isActive]);

  const {
    notificationsEnabled,
    permissionState,
    requestPermission,
    disableNotifications,
    enableNotifications,
    sendNotification,
  } = useNotifications();

  const { checkNotifications } = useCountdownNotifications(
    targetTime,
    isActive,
    notificationsEnabled,
    sendNotification,
  );

  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        // Update set timing state when countdown reaches zero
        updateSetTiming();
        setTimeLeft("Starting soon...");
        document.title = isActive ? "🟢 LIVE - Quiz" : "⏳ Starting... - Quiz";
        checkNotifications(diff);
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      const time = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      setTimeLeft(time);

      // Update browser tab title
      if (isActive) {
        document.title = `🟢 ${time} - Quiz`;
      } else {
        document.title = `⏳ ${time} - Quiz`;
      }

      // Check notifications
      checkNotifications(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(interval);
      document.title = "Quiz Night Live";
    };
  }, [targetTime, isActive, checkNotifications]);

  // Calculate pie chart progress (0-100) based on questions completed
  const pieProgress =
    totalQuestions > 0 ? (questionIndex / totalQuestions) * 100 : 0;

  // Notification toggle component
  const NotificationToggle = () => {
    if (permissionState === "unsupported") return null;

    if (permissionState === "denied") {
      return (
        <div className="text-sm text-gray-500">
          Notifications blocked (check browser settings)
        </div>
      );
    }

    if (permissionState === "granted") {
      return (
        <Button
          size="sm"
          variant="flat"
          onPress={
            notificationsEnabled ? disableNotifications : enableNotifications
          }
          className="text-sm"
        >
          {notificationsEnabled
            ? "🔔 Notifications on"
            : "🔕 Notifications off"}
        </Button>
      );
    }

    // Default state - request permission
    return (
      <Button
        size="sm"
        variant="flat"
        onPress={requestPermission}
        className="text-sm"
      >
        🔔 Notify me when it starts
      </Button>
    );
  };

  // SVG circle parameters
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pieProgress / 100) * circumference;

  return (
    <div className="text-center">
      {isActive ? (
        <div className="flex flex-col items-center">
          <div className="text-green-400 font-semibold mb-3">
            Set in Progress
          </div>

          {/* Circular progress indicator */}
          <div className="relative" style={{ width: size, height: size }}>
            {/* Background circle */}
            <svg className="transform -rotate-90" width={size} height={size}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                stroke="url(#progressGradient)"
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-500 ease-out"
              />
              <defs>
                <linearGradient
                  id="progressGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#4ade80" />
                </linearGradient>
              </defs>
            </svg>

            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-white">
                Q{questionIndex + 1}
              </div>
              <div className="text-sm text-gray-400">of {totalQuestions}</div>
            </div>
          </div>

          <div className="text-sm text-gray-400 mt-3">Join now to play!</div>

          {/* Notification toggle */}
          <div className="mt-4">
            <NotificationToggle />
          </div>

          {/* Did you know? facts */}
          <div className="mt-6 px-4">
            <div className="text-xs text-gray-500 mb-1">Did you know?</div>
            <div
              className={`text-sm text-gray-300 italic transition-opacity duration-300 ${
                factFading ? "opacity-0" : "opacity-100"
              }`}
            >
              {DID_YOU_KNOW_FACTS[factIndex].text}
            </div>
            <div className="mt-2">
              <a
                href={DID_YOU_KNOW_FACTS[factIndex].url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary-400 hover:text-primary-300 hover:underline"
              >
                Source: {DID_YOU_KNOW_FACTS[factIndex].source} →
              </a>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="text-yellow-400 font-semibold mb-2">
            Next Set Starts In
          </div>
          <div className="text-4xl font-bold text-white mb-4">{timeLeft}</div>

          {/* Notification toggle */}
          <div className="mt-4">
            <NotificationToggle />
          </div>
        </>
      )}
    </div>
  );
}

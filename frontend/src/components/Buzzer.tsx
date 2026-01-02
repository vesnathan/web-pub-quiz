"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

interface BuzzerProps {
  enabled: boolean;
  isWinner: boolean;
  deadline: number | null;
  otherPlayerBuzzed?: string | null; // Name of player who buzzed (if not current player)
}

export function Buzzer({
  enabled,
  isWinner,
  deadline,
  otherPlayerBuzzed,
}: BuzzerProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isUrgent, setIsUrgent] = useState(false);
  const { latency } = useGameStore();

  // Handle countdown when player wins the buzz
  useEffect(() => {
    if (!isWinner || !deadline) {
      setTimeLeft(null);
      setIsUrgent(false);
      return;
    }

    const updateTimeLeft = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        setTimeLeft(0);
        setIsUrgent(false);
      } else {
        setTimeLeft(remaining);
        // Last second - urgent flashing
        setIsUrgent(remaining <= 1000);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 50);

    return () => clearInterval(interval);
  }, [isWinner, deadline]);

  const handleBuzz = useCallback(() => {
    if (!enabled || isPressed) return;

    setIsPressed(true);

    // Send buzz event via Ably
    const event = new CustomEvent("playerBuzz", {
      detail: { timestamp: Date.now(), latency },
    });
    window.dispatchEvent(event);

    // Reset pressed state after a short delay
    setTimeout(() => setIsPressed(false), 500);
  }, [enabled, isPressed, latency]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && enabled && !isPressed) {
        e.preventDefault();
        handleBuzz();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, isPressed, handleBuzz]);

  const getBuzzerState = () => {
    if (isWinner) return "winner";
    if (otherPlayerBuzzed) return "other_buzzed";
    if (isPressed) return "pressed";
    if (!enabled) return "disabled";
    return "ready";
  };

  const state = getBuzzerState();

  const getButtonStyle = () => {
    if (state === "winner") {
      if (isUrgent) {
        return "cursor-default"; // Color handled by animation
      }
      return "bg-blue-500 cursor-default";
    }
    if (state === "other_buzzed") return "bg-purple-600 cursor-not-allowed";
    if (state === "ready")
      return "bg-green-500 hover:bg-green-600 active:bg-green-700 cursor-pointer";
    if (state === "pressed") return "bg-yellow-500 cursor-wait";
    if (state === "disabled")
      return "bg-gray-600 cursor-not-allowed opacity-50";
    return "bg-gray-600";
  };

  const getSecondsLeft = () => {
    if (timeLeft === null) return null;
    return Math.ceil(timeLeft / 1000);
  };

  const secondsLeft = getSecondsLeft();

  const getDisplayContent = () => {
    if (state === "winner") {
      return (
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={secondsLeft}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-5xl font-bold"
            >
              {secondsLeft !== null && secondsLeft > 0 ? secondsLeft : "!"}
            </motion.div>
          </AnimatePresence>
          <div className="text-sm mt-1">Answer now!</div>
        </div>
      );
    }
    if (state === "other_buzzed") {
      return (
        <div className="text-center px-2">
          <div className="text-sm">Buzzed!</div>
        </div>
      );
    }
    return <span>BUZZ</span>;
  };

  const getHelpText = () => {
    if (state === "ready") return "Press SPACE or click to buzz";
    if (state === "pressed") return "Buzzing...";
    if (state === "disabled") return "Wait for question";
    if (state === "other_buzzed") return `${otherPlayerBuzzed} is answering...`;
    if (state === "winner") {
      if (isUrgent) return "HURRY! Time running out!";
      return "Select your answer!";
    }
    return "";
  };

  return (
    <div className="flex flex-col items-center w-full">
      <motion.button
        className={`
          relative flex items-center justify-center
          text-white font-bold text-xl uppercase tracking-wider
          shadow-lg transition-colors
          ${getButtonStyle()}
          /* Mobile: rectangular like answer boxes */
          w-full p-4 rounded-lg border-2
          /* Desktop: circular button */
          md:w-40 md:h-40 md:rounded-full md:p-0
          ${state === "ready" ? "border-green-400" : "border-gray-600"}
          ${state === "winner" && !isUrgent ? "border-blue-400" : ""}
          ${state === "winner" && isUrgent ? "border-red-400" : ""}
          ${state === "other_buzzed" ? "border-purple-500" : ""}
        `}
        whileTap={state === "ready" ? { scale: 0.98 } : {}}
        whileHover={state === "ready" ? { scale: 1.02 } : {}}
        onClick={handleBuzz}
        disabled={state !== "ready"}
        animate={
          state === "winner"
            ? isUrgent
              ? {
                  backgroundColor: ["#ef4444", "#f97316", "#ef4444"], // red-500 to orange-500
                  scale: [1, 1.02, 1],
                }
              : {
                  backgroundColor: "#3b82f6", // blue-500
                }
            : {}
        }
        transition={
          isUrgent
            ? {
                duration: 0.2,
                repeat: Infinity,
              }
            : {}
        }
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3"
          >
            {getDisplayContent()}
          </motion.div>
        </AnimatePresence>
      </motion.button>

      <div
        className={`mt-2 text-center text-xs ${isUrgent ? "text-red-400 font-bold animate-pulse" : "text-gray-400"}`}
      >
        {getHelpText()}
      </div>
    </div>
  );
}

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

/**
 * Set start countdown overlay
 * Displays "Get Ready!" (3), "Get Set!" (2), "GO!" (1) synced with backend
 */
export function QuestionCountdown() {
  const countdownNumber = useGameStore((state) => state.countdownNumber);
  const countdownMessage = useGameStore((state) => state.countdownMessage);

  if (countdownNumber === null) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={countdownNumber}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-9xl font-bold text-primary-400"
            style={{
              textShadow: "0 0 40px rgba(124, 58, 237, 0.5)",
            }}
          >
            {countdownNumber}
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={countdownMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="mt-8 text-3xl font-bold text-white"
          >
            {countdownMessage}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/stores/gameStore";

interface QuestionCountdownProps {
  onComplete: () => void;
}

export function QuestionCountdown({ onComplete }: QuestionCountdownProps) {
  const [count, setCount] = useState(3);
  const { questionIndex, totalQuestions } = useGameStore();

  useEffect(() => {
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl text-gray-400 mb-4"
        >
          Question {questionIndex + 1} of {totalQuestions}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={count}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-9xl font-bold text-primary-400"
            style={{
              textShadow: "0 0 40px rgba(124, 58, 237, 0.5)",
            }}
          >
            {count > 0 ? count : "GO!"}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-gray-500"
        >
          Get ready...
        </motion.div>
      </div>
    </div>
  );
}

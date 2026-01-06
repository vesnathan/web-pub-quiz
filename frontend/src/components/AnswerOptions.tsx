"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AnswerOptionsProps {
  options: string[];
  selectedAnswer: number | null;
  revealedAnswer: number | null;
  isCorrect: boolean | null;
  canAnswer: boolean;
  wrongGuesses: number[]; // Indices of wrong answers this question
  lastPenalty: number | null; // For animation
}

export function AnswerOptions({
  options,
  selectedAnswer,
  revealedAnswer,
  isCorrect,
  canAnswer,
  wrongGuesses,
  lastPenalty,
}: AnswerOptionsProps) {
  const [penaltyAnimation, setPenaltyAnimation] = useState<{
    penalty: number;
    position: { x: number; y: number };
  } | null>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleSelectAnswer = (index: number, event: React.MouseEvent) => {
    if (!canAnswer || wrongGuesses.includes(index)) return;

    // Get click position for penalty animation
    const button = buttonRefs.current[index];
    if (button) {
      const rect = button.getBoundingClientRect();
      setPenaltyAnimation({
        penalty: 0, // Will be updated by lastPenalty
        position: {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        },
      });
    }

    // Dispatch event for useAbly to handle
    const customEvent = new CustomEvent("playerAnswer", {
      detail: { answerIndex: index },
    });
    window.dispatchEvent(customEvent);
  };

  // Show penalty animation when lastPenalty changes
  const [shownPenalty, setShownPenalty] = useState<number | null>(null);
  if (lastPenalty !== null && lastPenalty !== shownPenalty) {
    setShownPenalty(lastPenalty);
    if (penaltyAnimation) {
      setPenaltyAnimation({ ...penaltyAnimation, penalty: lastPenalty });
      // Clear animation after it completes
      setTimeout(() => setPenaltyAnimation(null), 1000);
    }
  }

  if (options.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Answer options will appear here
      </div>
    );
  }

  const letters = ["A", "B", "C", "D"];

  return (
    <div className="space-y-2 md:space-y-3">
      <h3 className="text-sm md:text-lg font-semibold text-white mb-2 md:mb-4 hidden md:block">
        {canAnswer ? "Select your answer:" : "Answer options:"}
      </h3>

      {/* Mobile: stacked, Desktop: 2x2 grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
        {options.map((option, index) => {
          const isSelected = selectedAnswer === index;
          const isRevealed = revealedAnswer === index;
          const isCorrectAnswer =
            revealedAnswer !== null && index === revealedAnswer;
          const isWrongGuess = wrongGuesses.includes(index);
          const isDisabled = isWrongGuess || !canAnswer;

          let stateClass = "";
          if (revealedAnswer !== null) {
            if (isCorrectAnswer) {
              stateClass = "border-green-500 bg-green-900/50";
            } else if (isSelected && !isCorrect) {
              stateClass = "border-red-500 bg-red-900/50";
            }
          } else if (isWrongGuess) {
            // Wrong guess - show red X styling
            stateClass = "border-red-500/50 bg-red-900/30 opacity-60";
          } else if (isSelected) {
            stateClass = "border-primary-500 bg-primary-900/50";
          }

          return (
            <motion.button
              key={index}
              ref={(el) => {
                buttonRefs.current[index] = el;
              }}
              className={`
                relative w-full p-2 md:p-4 rounded-lg border-2 text-left
                transition-all duration-200
                ${stateClass || "border-gray-600 hover:border-gray-500"}
                ${canAnswer && !isWrongGuess ? "cursor-pointer hover:bg-gray-700/50" : "cursor-default"}
                ${isWrongGuess ? "line-through" : ""}
              `}
              onClick={(e) => handleSelectAnswer(index, e)}
              disabled={isDisabled}
              whileTap={canAnswer && !isWrongGuess ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center">
                <span
                  className={`
                    w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0
                    text-xs md:text-sm font-bold mr-2 md:mr-3
                    ${isCorrectAnswer ? "bg-green-500 text-white" : ""}
                    ${isWrongGuess ? "bg-red-500 text-white" : ""}
                    ${isSelected && !isCorrect && revealedAnswer !== null ? "bg-red-500 text-white" : ""}
                    ${!isCorrectAnswer && !isWrongGuess && !(isSelected && !isCorrect && revealedAnswer !== null) ? "bg-gray-700 text-gray-300" : ""}
                  `}
                >
                  {isWrongGuess ? "✕" : letters[index]}
                </span>
                <span
                  className={`text-sm md:text-base ${isWrongGuess ? "text-gray-500" : "text-white"}`}
                >
                  {option}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Floating penalty animation */}
      <AnimatePresence>
        {penaltyAnimation && penaltyAnimation.penalty !== 0 && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -50 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="fixed text-red-500 font-bold text-2xl pointer-events-none z-50"
            style={{
              left: penaltyAnimation.position.x,
              top: penaltyAnimation.position.y,
            }}
          >
            {penaltyAnimation.penalty}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

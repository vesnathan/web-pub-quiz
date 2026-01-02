"use client";

import { motion } from "framer-motion";

interface AnswerOptionsProps {
  options: string[];
  selectedAnswer: number | null;
  revealedAnswer: number | null;
  isCorrect: boolean | null;
  canAnswer: boolean;
  disabled?: boolean; // Show grayed out options (before buzz)
}

export function AnswerOptions({
  options,
  selectedAnswer,
  revealedAnswer,
  isCorrect,
  canAnswer,
  disabled = false,
}: AnswerOptionsProps) {
  const handleSelectAnswer = (index: number) => {
    if (!canAnswer) return;

    // Dispatch event for useAbly to handle
    const event = new CustomEvent("playerAnswer", {
      detail: { answerIndex: index },
    });
    window.dispatchEvent(event);
  };

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

          let stateClass = "";
          if (revealedAnswer !== null) {
            if (isCorrectAnswer) {
              stateClass = "border-green-500 bg-green-900/50";
            } else if (isSelected && !isCorrect) {
              stateClass = "border-red-500 bg-red-900/50";
            }
          } else if (isSelected) {
            stateClass = "border-primary-500 bg-primary-900/50";
          }

          return (
            <motion.button
              key={index}
              className={`
                w-full p-3 md:p-4 rounded-lg border-2 text-left
                transition-all duration-200
                ${stateClass || "border-gray-600 hover:border-gray-500"}
                ${canAnswer ? "cursor-pointer hover:bg-gray-700/50" : "cursor-default"}
                ${disabled ? "opacity-50" : ""}
                ${!canAnswer && !disabled && revealedAnswer === null ? "opacity-75" : ""}
              `}
              onClick={() => handleSelectAnswer(index)}
              disabled={!canAnswer || disabled}
              whileTap={canAnswer && !disabled ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center">
                <span
                  className={`
                    w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0
                    text-xs md:text-sm font-bold mr-2 md:mr-3
                    ${isCorrectAnswer ? "bg-green-500 text-white" : ""}
                    ${isSelected && !isCorrect && revealedAnswer !== null ? "bg-red-500 text-white" : ""}
                    ${!isCorrectAnswer && !(isSelected && !isCorrect && revealedAnswer !== null) ? "bg-gray-700 text-gray-300" : ""}
                  `}
                >
                  {letters[index]}
                </span>
                <span className="text-white text-sm md:text-base">
                  {option}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

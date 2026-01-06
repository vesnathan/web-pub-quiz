"use client";

import { useEffect, useState } from "react";
import { CircularProgress } from "@nextui-org/react";
import type { Question } from "@quiz/shared";
import { useGameStore } from "@/stores/gameStore";

interface QuestionDisplayProps {
  question: Omit<Question, "correctIndex"> | null;
}

export function QuestionDisplay({ question }: QuestionDisplayProps) {
  const questionStartTime = useGameStore((state) => state.questionStartTime);
  const questionDuration = useGameStore((state) => state.questionDuration);
  const gamePhase = useGameStore((state) => state.gamePhase);

  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  // Countdown timer for question
  useEffect(() => {
    if (!questionStartTime || !questionDuration || gamePhase !== "question") {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - questionStartTime;
      const remaining = Math.max(0, questionDuration - elapsed);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 100);

    return () => clearInterval(interval);
  }, [questionStartTime, questionDuration, gamePhase]);

  if (!question) {
    return (
      <div className="text-center py-12">
        <div className="text-2xl text-gray-400 mb-4">
          Waiting for next question...
        </div>
        <div className="animate-pulse flex justify-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full" />
        </div>
      </div>
    );
  }

  const timerProgress =
    questionDuration > 0 ? (timeRemaining / questionDuration) * 100 : 0;
  const timerSeconds = Math.ceil(timeRemaining / 1000);

  // Determine timer color based on time remaining
  const getTimerColor = () => {
    if (timerSeconds <= 2) return "danger";
    if (timerSeconds <= 4) return "warning";
    return "primary";
  };

  return (
    <div>
      {/* Category and Timer */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4"></div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-400 capitalize">
            {question.category}
          </span>
          {/* Question Timer - always reserve space to prevent layout shift */}
          <div className="flex items-center gap-2 min-w-[70px]">
            {gamePhase === "question" && timerSeconds > 0 ? (
              <>
                <CircularProgress
                  value={timerProgress}
                  color={getTimerColor()}
                  size="sm"
                  aria-label="Time remaining"
                  classNames={{
                    svg: "w-10 h-10",
                    value: "text-xs font-bold",
                  }}
                  showValueLabel={false}
                />
                <span
                  className={`text-lg font-bold ${
                    timerSeconds <= 2
                      ? "text-red-400"
                      : timerSeconds <= 4
                        ? "text-yellow-400"
                        : "text-primary-400"
                  }`}
                >
                  {timerSeconds}s
                </span>
              </>
            ) : (
              /* Empty placeholder to maintain layout */
              <div className="w-10 h-10" />
            )}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="text-sm md:text-2xl font-semibold text-white text-center py-3 md:py-8">
        {question.text}
      </div>

      {/* Difficulty badge */}
      <div className="flex justify-center">
        <span
          className={`
            px-3 py-1 rounded-full text-xs font-medium
            ${question.difficulty === "easy" ? "bg-green-900 text-green-300" : ""}
            ${question.difficulty === "medium" ? "bg-yellow-900 text-yellow-300" : ""}
            ${question.difficulty === "hard" ? "bg-red-900 text-red-300" : ""}
          `}
        >
          {question.difficulty}
        </span>
      </div>
    </div>
  );
}

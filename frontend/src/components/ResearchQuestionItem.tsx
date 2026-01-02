"use client";

import { useState } from "react";
import type { CompletedQuestion } from "@/stores/gameStore";

interface ResearchQuestionItemProps {
  question: CompletedQuestion;
  questionNumber: number;
}

export function ResearchQuestionItem({
  question: q,
  questionNumber,
}: ResearchQuestionItemProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const handleOptionClick = (optIndex: number) => {
    // Toggle selection - if already selected, deselect
    setSelectedOption((prev) => (prev === optIndex ? null : optIndex));
  };

  return (
    <div className="space-y-3 pb-2">
      <p className="text-white font-medium">{q.question}</p>
      <div className="space-y-1">
        {q.options.map((option, optIndex) => {
          const isCorrect = optIndex === q.correctIndex;
          const isSelected = selectedOption === optIndex;
          const isWrongSelected = isSelected && !isCorrect;

          return (
            <button
              key={optIndex}
              onClick={() => handleOptionClick(optIndex)}
              className={`
                w-full text-left text-sm p-2 rounded transition-all duration-200
                ${
                  isCorrect
                    ? "bg-green-900/50 text-green-300 border border-green-500/50"
                    : isWrongSelected
                      ? "bg-red-900/50 text-red-300 border border-red-500/50"
                      : isSelected
                        ? "bg-gray-600/50 text-gray-200 border border-gray-500/50"
                        : "text-gray-400 hover:bg-gray-700/50 hover:text-gray-300 cursor-pointer"
                }
              `}
            >
              <div className="flex items-start gap-2">
                <span className="font-medium min-w-[20px]">
                  {isCorrect ? "✓" : isWrongSelected ? "✗" : ""}
                </span>
                <span className="flex-1">{option}</span>
              </div>
              {isWrongSelected && (
                <div className="mt-2 pt-2 border-t border-red-500/30 text-xs text-red-300/80">
                  This is not the correct answer. The correct answer is
                  highlighted in green above.
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Show explanation */}
      {(q.detailedExplanation || q.explanation) && (
        <div className="text-sm text-gray-300 border-l-2 border-primary-500/50 pl-3 space-y-2">
          {(q.detailedExplanation || q.explanation || "")
            .split("\n")
            .map((line, i) => (
              <p key={i}>{line}</p>
            ))}
        </div>
      )}

      {/* Citation link */}
      {q.citationUrl && (
        <a
          href={q.citationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
        >
          <span>🔗</span>
          {q.citationTitle || "Learn more"}
        </a>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardBody } from "@nextui-org/react";
import { useGameStore } from "@/stores/gameStore";
import { BadgeRevolver } from "@/components/badges";
import type { LeaderboardEntry, AwardBadge } from "@quiz/shared";
import { getBadgeById } from "@quiz/shared";

interface QuestionResultsProps {
  question: { text: string; options: string[]; category: string } | null;
  correctIndex: number | null;
  explanation: string | null;
  wasAnswered: boolean;
  wasCorrect: boolean | null;
  buzzerWinnerName: string | null;
  nextQuestionTime: number | null;
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string;
  earnedBadgeIds?: string[];
}

export function QuestionResults({
  question,
  correctIndex,
  explanation,
  wasAnswered,
  wasCorrect,
  buzzerWinnerName,
  nextQuestionTime,
  leaderboard,
  currentPlayerId,
  earnedBadgeIds = [],
}: QuestionResultsProps) {
  const [countdown, setCountdown] = useState<number>(0);

  // Convert badge IDs to full badge objects
  const earnedBadges: AwardBadge[] = earnedBadgeIds
    .map((id) => getBadgeById(id))
    .filter((badge): badge is AwardBadge => badge !== undefined);

  // Countdown timer
  useEffect(() => {
    if (!nextQuestionTime) return;

    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.ceil((nextQuestionTime - Date.now()) / 1000),
      );
      setCountdown(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 100);

    return () => clearInterval(interval);
  }, [nextQuestionTime]);

  if (!question || correctIndex === null) {
    return null;
  }

  const letters = ["A", "B", "C", "D"];

  return (
    <div className="space-y-6">
      {/* Result Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        {wasAnswered ? (
          wasCorrect ? (
            <div className="text-4xl font-bold text-green-400 mb-2">
              Correct!
            </div>
          ) : (
            <div className="text-4xl font-bold text-red-400 mb-2">
              {buzzerWinnerName
                ? `${buzzerWinnerName} got it wrong!`
                : "Incorrect!"}
            </div>
          )
        ) : (
          <div className="text-4xl font-bold text-yellow-400 mb-2">
            Time's Up!
          </div>
        )}
        <p className="text-gray-400">
          {wasAnswered
            ? wasCorrect
              ? `${buzzerWinnerName || "Player"} answered correctly!`
              : "Nobody got the correct answer"
            : "Nobody buzzed in time"}
        </p>
      </motion.div>

      {/* Badge Revolver - shows badges earned this question */}
      {earnedBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30">
            <CardBody className="p-4">
              <div className="text-center text-sm text-purple-300 mb-2 font-semibold">
                Badges Earned!
              </div>
              <BadgeRevolver badges={earnedBadges} startDelay={800} />
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Correct Answer */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="bg-green-900/30 border-2 border-green-500">
          <CardBody className="p-4">
            <div className="text-sm text-green-300 mb-2">Correct Answer:</div>
            <div className="flex items-center">
              <span className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-lg font-bold mr-3">
                {letters[correctIndex]}
              </span>
              <span className="text-xl text-white font-semibold">
                {question.options[correctIndex]}
              </span>
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Explanation */}
      {explanation && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gray-800/50">
            <CardBody className="p-4">
              <div className="text-sm text-primary-400 mb-2 font-semibold">
                Did you know?
              </div>
              <p className="text-gray-200 leading-relaxed">{explanation}</p>
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-gray-800/50">
          <CardBody className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">Leaderboard</h3>
              <div className="text-sm text-gray-400">
                Next question in{" "}
                <span className="text-primary-400 font-bold">{countdown}s</span>
              </div>
            </div>

            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, index) => {
                const isCurrentPlayer = entry.userId === currentPlayerId;
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                    className={`
                      flex items-center p-2 rounded-lg
                      ${isCurrentPlayer ? "bg-primary-900/50 border border-primary-500" : ""}
                    `}
                  >
                    <div
                      className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mr-3
                        ${entry.rank === 1 ? "bg-yellow-500 text-black" : ""}
                        ${entry.rank === 2 ? "bg-gray-400 text-black" : ""}
                        ${entry.rank === 3 ? "bg-amber-700 text-white" : ""}
                        ${entry.rank > 3 ? "bg-gray-700 text-gray-300" : ""}
                      `}
                    >
                      {entry.rank}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`font-semibold ${isCurrentPlayer ? "text-primary-300" : "text-white"}`}
                      >
                        {entry.displayName}
                        {isCurrentPlayer && (
                          <span className="text-xs ml-2">(you)</span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`font-bold ${entry.score >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {entry.score > 0 ? "+" : ""}
                      {entry.score}
                    </div>
                  </motion.div>
                );
              })}

              {/* Show current player if not in top 5 */}
              {!leaderboard
                .slice(0, 5)
                .some((e) => e.userId === currentPlayerId) && (
                <div className="border-t border-gray-700 pt-2 mt-2">
                  {leaderboard
                    .filter((e) => e.userId === currentPlayerId)
                    .map((entry) => (
                      <div
                        key={entry.userId}
                        className="flex items-center p-2 rounded-lg bg-primary-900/50 border border-primary-500"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-700 text-gray-300 flex items-center justify-center text-sm font-bold mr-3">
                          {entry.rank}
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-primary-300">
                            {entry.displayName}
                            <span className="text-xs ml-2">(you)</span>
                          </div>
                        </div>
                        <div
                          className={`font-bold ${entry.score >= 0 ? "text-green-400" : "text-red-400"}`}
                        >
                          {entry.score > 0 ? "+" : ""}
                          {entry.score}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

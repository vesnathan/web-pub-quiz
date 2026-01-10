"use client";

import { Card, CardBody, Button } from "@nextui-org/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { CompletedQuestion } from "@/stores/gameStore";
import { useGameStore } from "@/stores/gameStore";
import type { LeaderboardEntry } from "@quiz/shared";
import { BadgeBar } from "@/components/badges";

interface SessionSummaryProps {
  completedQuestions: CompletedQuestion[];
  finalScore: number;
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string;
  onClose: () => void;
}

export function SessionSummary({
  completedQuestions,
  finalScore,
  leaderboard,
  currentPlayerId,
  onClose,
}: SessionSummaryProps) {
  const router = useRouter();
  const { earnedBadgesThisSet } = useGameStore();

  const correctCount = completedQuestions.filter((q) => q.userCorrect).length;
  const wrongCount = completedQuestions.filter(
    (q) => q.userAnswered && !q.userCorrect,
  ).length;
  const unansweredCount = completedQuestions.filter(
    (q) => !q.userAnswered,
  ).length;
  const totalQuestions = completedQuestions.length;
  const accuracy =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  // Find current player's rank
  const playerRank = leaderboard.find(
    (e) => e.userId === currentPlayerId,
  )?.rank;

  const handleReturnToLobby = () => {
    onClose();
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-2xl"
        >
          <Card className="bg-gray-800/90 border border-gray-700">
            <CardBody className="p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Header */}
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Session Complete
                </h2>
                <p className="text-gray-400">Here's how you did!</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  label="Questions"
                  value={totalQuestions}
                  color="text-white"
                />
                <StatCard
                  label="Correct"
                  value={correctCount}
                  color="text-green-400"
                />
                <StatCard
                  label="Wrong"
                  value={wrongCount}
                  color="text-red-400"
                />
                <StatCard
                  label="Accuracy"
                  value={`${accuracy}%`}
                  color="text-primary-400"
                />
              </div>

              {/* Score and Rank */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-gray-400 text-sm mb-1">Final Score</div>
                  <div
                    className={`text-3xl font-bold ${finalScore >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {finalScore > 0 ? "+" : ""}
                    {finalScore}
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <div className="text-gray-400 text-sm mb-1">Room Rank</div>
                  <div className="text-3xl font-bold text-primary-400">
                    #{playerRank || "-"}
                  </div>
                </div>
              </div>

              {/* Session Badges */}
              {earnedBadgesThisSet.length > 0 && (
                <BadgeBar
                  badgeIds={earnedBadgesThisSet}
                  title="Badges Earned This Session"
                />
              )}

              {/* Question Review */}
              {completedQuestions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">
                    Question Review
                  </h3>
                  <div className="space-y-3">
                    {completedQuestions.map((q, index) => (
                      <QuestionReviewItem
                        key={index}
                        question={q}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Return Button */}
              <Button
                color="primary"
                size="lg"
                className="w-full"
                onPress={handleReturnToLobby}
              >
                Return to Lobby
              </Button>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  color: string;
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className="bg-gray-700/50 rounded-xl p-3 text-center">
      <div className="text-gray-400 text-xs mb-1">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

interface QuestionReviewItemProps {
  question: CompletedQuestion;
  index: number;
}

function QuestionReviewItem({ question, index }: QuestionReviewItemProps) {
  const letters = ["A", "B", "C", "D"];

  // Use detailed explanation if available, otherwise fall back to short explanation
  const explanation = question.detailedExplanation || question.explanation;

  return (
    <div
      className={`p-4 rounded-lg border ${
        question.userCorrect
          ? "border-green-500/30 bg-green-900/20"
          : question.userAnswered
            ? "border-red-500/30 bg-red-900/20"
            : "border-gray-600/30 bg-gray-700/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            question.userCorrect
              ? "bg-green-500 text-white"
              : question.userAnswered
                ? "bg-red-500 text-white"
                : "bg-gray-600 text-gray-300"
          }`}
        >
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          {/* Question text */}
          <p className="text-sm text-white">{question.question}</p>

          {/* Correct answer */}
          <p className="text-xs text-green-400 mt-2 font-medium">
            Answer: {letters[question.correctIndex]}.{" "}
            {question.options[question.correctIndex]}
          </p>

          {/* Detailed explanation for research */}
          {explanation && (
            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
              {explanation}
            </p>
          )}

          {/* Citation link */}
          {question.citationUrl && (
            <a
              href={question.citationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-400 hover:text-primary-300 mt-2 inline-block"
            >
              {question.citationTitle || "Source"}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

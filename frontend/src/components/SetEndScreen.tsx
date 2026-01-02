"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardBody, Button } from "@nextui-org/react";
import { useGameStore, type CompletedQuestion } from "@/stores/gameStore";
import { BadgeUnlockSummary, BadgeRevolver } from "@/components/badges";
import { ResearchQuestionItem } from "@/components/ResearchQuestionItem";
import type { LeaderboardEntry, AwardBadge } from "@quiz/shared";
import { getBadgeById } from "@quiz/shared";
import { Accordion, AccordionItem } from "@nextui-org/react";

interface SetEndScreenProps {
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string;
  earnedBadgeIds?: string[];
}

export function SetEndScreen({
  leaderboard,
  currentPlayerId,
  earnedBadgeIds = [],
}: SetEndScreenProps) {
  const router = useRouter();
  const { nextSetTime, isSetActive, resetGame, completedQuestions } =
    useGameStore();
  const [timeUntilNext, setTimeUntilNext] = useState<string>("");

  // Convert badge IDs to full badge objects (includes duplicates for repeatable badges)
  const earnedBadges: AwardBadge[] = earnedBadgeIds
    .map((id) => getBadgeById(id))
    .filter((badge): badge is AwardBadge => badge !== undefined);

  // Count unique badges
  const uniqueBadgeCount = new Set(earnedBadges.map((b) => b.id)).size;

  const totalSkillPointsEarned = earnedBadges.reduce(
    (sum, badge) => sum + badge.skillPoints,
    0,
  );

  // Calculate time until next set
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const diff = nextSetTime - now;

      if (diff <= 0) {
        setTimeUntilNext("Starting soon...");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeUntilNext(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [nextSetTime]);

  // Find current player's entry
  const currentPlayerEntry = leaderboard.find(
    (e) => e.userId === currentPlayerId,
  );
  const playerRank = currentPlayerEntry?.rank || leaderboard.length;
  const playerScore = currentPlayerEntry?.score || 0;

  // Top 3 for podium
  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Set Complete Header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <div className="text-5xl mb-4">🏆</div>
        <h1 className="text-4xl font-bold text-white mb-2">Set Complete!</h1>
        <p className="text-xl text-gray-400">Great game, everyone!</p>
      </motion.div>

      {/* Your Result and Podium - Side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Player's Result */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            className={`h-full ${playerRank <= 3 ? "bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500" : "bg-gray-800/50"}`}
          >
            <CardBody className="p-6 text-center flex flex-col justify-center">
              <div className="text-lg text-gray-400 mb-1">Your Result</div>
              <div className="text-4xl font-bold text-white mb-2">
                #{playerRank}
                {playerRank === 1 && <span className="ml-2">👑</span>}
                {playerRank === 2 && <span className="ml-2">🥈</span>}
                {playerRank === 3 && <span className="ml-2">🥉</span>}
              </div>
              <div
                className={`text-2xl font-bold ${playerScore >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {playerScore > 0 ? "+" : ""}
                {playerScore} points
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Podium for top 3 */}
        {topThree.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-gray-800/50 h-full">
              <CardBody className="p-4">
                <div className="text-lg text-gray-400 mb-2 text-center">
                  The Podium
                </div>
                <div className="flex justify-center items-end gap-3 py-4">
                  {/* 2nd Place */}
                  {topThree[1] && (
                    <div className="flex flex-col items-center">
                      <div className="text-2xl mb-1">🥈</div>
                      <div className="text-xs text-gray-400 truncate max-w-[80px]">
                        {topThree[1].displayName}
                      </div>
                      <div className="text-sm font-bold text-gray-300">
                        {topThree[1].score > 0 ? "+" : ""}
                        {topThree[1].score}
                      </div>
                      <div className="w-16 h-14 bg-gray-500 rounded-t-lg mt-1" />
                    </div>
                  )}

                  {/* 1st Place */}
                  {topThree[0] && (
                    <div className="flex flex-col items-center">
                      <div className="text-3xl mb-1">👑</div>
                      <div className="text-xs text-yellow-400 truncate max-w-[90px] font-semibold">
                        {topThree[0].displayName}
                      </div>
                      <div className="text-base font-bold text-yellow-300">
                        {topThree[0].score > 0 ? "+" : ""}
                        {topThree[0].score}
                      </div>
                      <div className="w-20 h-20 bg-yellow-600 rounded-t-lg mt-1" />
                    </div>
                  )}

                  {/* 3rd Place */}
                  {topThree[2] && (
                    <div className="flex flex-col items-center">
                      <div className="text-2xl mb-1">🥉</div>
                      <div className="text-xs text-gray-400 truncate max-w-[80px]">
                        {topThree[2].displayName}
                      </div>
                      <div className="text-sm font-bold text-gray-300">
                        {topThree[2].score > 0 ? "+" : ""}
                        {topThree[2].score}
                      </div>
                      <div className="w-16 h-10 bg-amber-700 rounded-t-lg mt-1" />
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Badges Earned - Revolver Animation */}
      {earnedBadges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30">
            <CardBody className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-xl font-bold text-white mb-1">
                  Badges Earned!
                </h3>
                <p className="text-sm text-gray-400">
                  You earned {uniqueBadgeCount} badge
                  {uniqueBadgeCount !== 1 ? "s" : ""}
                  {earnedBadges.length > uniqueBadgeCount
                    ? ` (${earnedBadges.length} total)`
                    : ""}{" "}
                  and{" "}
                  <span className="text-purple-300 font-semibold">
                    +{totalSkillPointsEarned} skill points
                  </span>
                </p>
              </div>
              <BadgeRevolver badges={earnedBadges} />
            </CardBody>
          </Card>
        </motion.div>
      )}

      {/* Research Section - Review Questions */}
      {completedQuestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card className="bg-gray-800/50">
            <CardBody className="p-4">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📚</span> Research & Review
              </h3>
              <p className="text-sm text-gray-400 mb-4">
                Explore the answers and learn more about this set's questions.
              </p>
              <Accordion variant="splitted" className="gap-2">
                {completedQuestions.map((q, index) => (
                  <AccordionItem
                    key={index}
                    aria-label={`Question ${index + 1}`}
                    title={
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm ${q.userCorrect === true ? "text-green-400" : q.userCorrect === false ? "text-red-400" : "text-gray-400"}`}
                        >
                          {q.userCorrect === true
                            ? "✓"
                            : q.userCorrect === false
                              ? "✗"
                              : "–"}
                        </span>
                        <span className="text-sm text-white line-clamp-1">
                          Q{index + 1}: {q.question}
                        </span>
                      </div>
                    }
                    classNames={{
                      base: "bg-gray-700/50",
                      title: "text-white",
                      content: "text-gray-300",
                    }}
                  >
                    <ResearchQuestionItem
                      question={q}
                      questionNumber={index + 1}
                    />
                  </AccordionItem>
                ))}
              </Accordion>
            </CardBody>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// Sidebar component for the right column
export function SetEndSidebar({
  leaderboard,
  currentPlayerId,
}: {
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string;
}) {
  const router = useRouter();
  const { nextSetTime, resetGame } = useGameStore();
  const [timeUntilNext, setTimeUntilNext] = useState<string>("");

  // Calculate time until next set
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const diff = nextSetTime - now;

      if (diff <= 0) {
        setTimeUntilNext("Starting soon...");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeUntilNext(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [nextSetTime]);

  return (
    <div className="space-y-4">
      {/* Full Leaderboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gray-800/50">
          <CardBody className="p-4">
            <h3 className="text-lg font-semibold text-white mb-4">
              Final Standings
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {leaderboard.map((entry, index) => {
                const isCurrentPlayer = entry.userId === currentPlayerId;
                return (
                  <motion.div
                    key={entry.userId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.05 }}
                    className={`
                      flex items-center p-2 rounded-lg
                      ${isCurrentPlayer ? "bg-primary-900/50 border border-primary-500" : "hover:bg-gray-700/50"}
                    `}
                  >
                    <div
                      className={`
                        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mr-2
                        ${entry.rank === 1 ? "bg-yellow-500 text-black" : ""}
                        ${entry.rank === 2 ? "bg-gray-400 text-black" : ""}
                        ${entry.rank === 3 ? "bg-amber-700 text-white" : ""}
                        ${entry.rank > 3 ? "bg-gray-700 text-gray-300" : ""}
                      `}
                    >
                      {entry.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-semibold text-sm truncate ${isCurrentPlayer ? "text-primary-300" : "text-white"}`}
                      >
                        {entry.displayName}
                        {isCurrentPlayer && (
                          <span className="text-xs ml-1">(you)</span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`font-bold text-sm ${entry.score >= 0 ? "text-green-400" : "text-red-400"}`}
                    >
                      {entry.score > 0 ? "+" : ""}
                      {entry.score}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Next Set Timer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card className="bg-primary-900/30 border border-primary-500/50">
          <CardBody className="p-4 text-center">
            <div className="text-sm text-gray-400 mb-1">Next set starts in</div>
            <div className="text-2xl font-bold text-primary-400">
              {timeUntilNext}
            </div>
          </CardBody>
        </Card>
      </motion.div>

      {/* Return to Lobby Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <Button
          color="default"
          variant="bordered"
          size="lg"
          className="w-full"
          onPress={() => {
            resetGame();
            router.push("/");
          }}
        >
          Return to Lobby
        </Button>
      </motion.div>
    </div>
  );
}

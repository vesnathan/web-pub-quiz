"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardBody, Button } from "@nextui-org/react";
import { LoadingScreen, LoadingDots } from "@/components/LoadingScreen";
import { useGameStore } from "@/stores/gameStore";
import { useAuth } from "@/contexts/AuthContext";
import { QuestionPhase } from "@/components/game";
import type { Player, LeaderboardEntry, Question } from "@quiz/shared";
import { PlayerList } from "@/components/PlayerList";
import { QuestionResults } from "@/components/QuestionResults";
import { BadgeAwardAnimation } from "@/components/badges";
import { useAbly } from "@/hooks/useAbly";
import { useAntiCheat } from "@/hooks/useAntiCheat";
import { useSubscription } from "@/hooks/useSubscription";
import { AppFooter } from "@/components/AppFooter";
import { GameBackground } from "@/components/GameBackground";
import { SessionKickedOverlay } from "@/components/SessionKickedOverlay";
import { SessionSummary } from "@/components/SessionSummary";
import { DID_YOU_KNOW_FACTS } from "@/data/didYouKnowFacts";

export default function GamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get("roomId");
  const { isLoading: authLoading } = useAuth();
  const {
    questionsRemainingToday,
    hasUnlimitedQuestions,
    recordQuestionAnswered,
  } = useSubscription();

  // Minimal store access - use selectors for specific state
  const player = useGameStore((state) => state.player);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const scores = useGameStore((state) => state.scores);
  const players = useGameStore((state) => state.players);
  const currentRoomId = useGameStore((state) => state.currentRoomId);
  const setCurrentRoomId = useGameStore((state) => state.setCurrentRoomId);

  // For results phase
  const currentQuestion = useGameStore((state) => state.currentQuestion);
  const revealedAnswer = useGameStore((state) => state.revealedAnswer);
  const explanation = useGameStore((state) => state.explanation);
  const wasAnswered = useGameStore((state) => state.wasAnswered);
  const wasCorrect = useGameStore((state) => state.wasCorrect);
  const questionWinnerName = useGameStore((state) => state.questionWinnerName);
  const questionWinner = useGameStore((state) => state.questionWinner);
  const nextQuestionTime = useGameStore((state) => state.nextQuestionTime);
  const setLeaderboard = useGameStore((state) => state.setLeaderboard);
  const earnedBadgesThisQuestion = useGameStore(
    (state) => state.earnedBadgesThisQuestion,
  );
  const earnedBadgesThisSet = useGameStore(
    (state) => state.earnedBadgesThisSet,
  );
  const gotCorrectButSlow = useGameStore((state) => state.gotCorrectButSlow);
  const fasterWinnerName = useGameStore((state) => state.fasterWinnerName);
  const lastPoints = useGameStore((state) => state.lastPoints);

  // For overlays
  const pendingBadgeAward = useGameStore((state) => state.pendingBadgeAward);
  const setPendingBadgeAward = useGameStore(
    (state) => state.setPendingBadgeAward,
  );
  const setGamePhase = useGameStore((state) => state.setGamePhase);

  const effectiveRoomId = roomIdFromUrl || currentRoomId;

  // Store roomId from URL if we don't have one
  useEffect(() => {
    if (roomIdFromUrl && !currentRoomId) {
      setCurrentRoomId(roomIdFromUrl);
    }
  }, [roomIdFromUrl, currentRoomId, setCurrentRoomId]);

  // Initialize Ably and anti-cheat
  useAbly(effectiveRoomId);
  useAntiCheat();

  // Room validation - allow both authenticated users and guests with a player set
  useEffect(() => {
    if (authLoading) return;

    // Need either authenticated user OR a guest player
    const hasValidPlayer = player !== null;

    if (!hasValidPlayer) {
      router.push("/");
    } else if (!effectiveRoomId) {
      router.push("/");
    }
  }, [player, router, authLoading, effectiveRoomId]);

  const handleBadgeAnimationComplete = useCallback(() => {
    setPendingBadgeAward(null);
  }, [setPendingBadgeAward]);

  // Loading states
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Show loading screen when leaving to prevent stale state flash
  if (gamePhase === "leaving") {
    return <LoadingScreen />;
  }

  // Allow both authenticated users and guests with a valid player
  if (!player) {
    return null;
  }

  const playerScore = scores[player.id] || 0;
  const resetGame = useGameStore((state) => state.resetGame);
  const completedQuestions = useGameStore((state) => state.completedQuestions);
  const [showSessionSummary, setShowSessionSummary] = useState(false);
  // Capture session data when leaving (before state reset)
  const [sessionData, setSessionData] = useState<{
    questions: typeof completedQuestions;
    score: number;
    leaderboard: typeof setLeaderboard;
  } | null>(null);

  const handleLeaveRoom = useCallback(() => {
    // Capture session data before any state changes
    const capturedData = {
      questions: [...completedQuestions],
      score: scores[player?.id || ""] || 0,
      leaderboard: [...setLeaderboard],
    };

    // Show session summary if player answered any questions
    if (capturedData.questions.length > 0) {
      setSessionData(capturedData);
      setShowSessionSummary(true);
    } else {
      // No questions answered, just leave
      setGamePhase("leaving");
      resetGame();
      router.push("/");
    }
  }, [
    completedQuestions,
    scores,
    player?.id,
    setLeaderboard,
    setGamePhase,
    resetGame,
    router,
  ]);

  const handleCloseSummary = useCallback(() => {
    setShowSessionSummary(false);
    setSessionData(null);
    setGamePhase("leaving");
    resetGame();
  }, [setGamePhase, resetGame]);

  // Track question count for guest/free tier limits
  const prevQuestionsCount = useRef(completedQuestions.length);
  useEffect(() => {
    if (completedQuestions.length > prevQuestionsCount.current) {
      // A new question was completed - record it for daily limit
      recordQuestionAnswered();
    }
    prevQuestionsCount.current = completedQuestions.length;
  }, [completedQuestions.length, recordQuestionAnswered]);

  return (
    <GameBackground>
      {/* Main content with bottom padding for fixed bottom bar */}
      <main className="p-4 pb-20 flex-grow">
        <div className="max-w-7xl mx-auto">
          <GameLayout
            gamePhase={gamePhase}
            players={players}
            scores={scores}
            currentPlayerId={player.id}
            questionWinnerId={questionWinner}
            currentQuestion={currentQuestion}
            revealedAnswer={revealedAnswer}
            explanation={explanation}
            wasAnswered={wasAnswered}
            wasCorrect={wasCorrect}
            questionWinnerName={questionWinnerName}
            nextQuestionTime={nextQuestionTime}
            leaderboard={setLeaderboard}
            earnedBadgeIds={earnedBadgesThisQuestion}
            onLeaveRoom={handleLeaveRoom}
            gotCorrectButSlow={gotCorrectButSlow}
            fasterWinnerName={fasterWinnerName}
            pointsAwarded={lastPoints}
          />
        </div>
      </main>

      {/* Fixed bottom bar with game status and user menu */}
      <AppFooter
        showGameInfo
        playerScore={playerScore}
        questionsRemaining={questionsRemainingToday}
        hasUnlimitedQuestions={hasUnlimitedQuestions}
      />

      {/* Overlays */}
      <BadgeAwardAnimation
        badge={pendingBadgeAward}
        onComplete={handleBadgeAnimationComplete}
      />
      <SessionKickedOverlay />

      {/* Session Summary */}
      {showSessionSummary && sessionData && (
        <SessionSummary
          completedQuestions={sessionData.questions}
          finalScore={sessionData.score}
          leaderboard={sessionData.leaderboard}
          currentPlayerId={player.id}
          onClose={handleCloseSummary}
        />
      )}
    </GameBackground>
  );
}

// Main game layout component
interface GameLayoutProps {
  gamePhase: string;
  players: Player[];
  scores: Record<string, number>;
  currentPlayerId: string;
  questionWinnerId: string | null;
  currentQuestion: Omit<Question, "correctIndex"> | null;
  revealedAnswer: number | null;
  explanation: string | null;
  wasAnswered: boolean;
  wasCorrect: boolean | null;
  questionWinnerName: string | null;
  nextQuestionTime: number | null;
  leaderboard: LeaderboardEntry[];
  earnedBadgeIds: string[];
  onLeaveRoom: () => void;
  gotCorrectButSlow: boolean;
  fasterWinnerName: string | null;
  pointsAwarded: number | null;
}

function GameLayout({
  gamePhase,
  players,
  scores,
  currentPlayerId,
  questionWinnerId,
  currentQuestion,
  revealedAnswer,
  explanation,
  wasAnswered,
  wasCorrect,
  questionWinnerName,
  nextQuestionTime,
  leaderboard,
  earnedBadgeIds,
  onLeaveRoom,
  gotCorrectButSlow,
  fasterWinnerName,
  pointsAwarded,
}: GameLayoutProps) {
  // Show waiting state when no question is available
  const isWaiting = !currentQuestion && gamePhase !== "results";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6 min-h-[600px]">
        {gamePhase === "results" ? (
          <QuestionResults
            question={currentQuestion}
            correctIndex={revealedAnswer}
            explanation={explanation}
            wasAnswered={wasAnswered}
            wasCorrect={wasCorrect}
            questionWinnerName={questionWinnerName}
            nextQuestionTime={nextQuestionTime}
            leaderboard={leaderboard}
            currentPlayerId={currentPlayerId}
            earnedBadgeIds={earnedBadgeIds}
            gotCorrectButSlow={gotCorrectButSlow}
            fasterWinnerName={fasterWinnerName}
            pointsAwarded={pointsAwarded}
          />
        ) : isWaiting ? (
          <WaitingForGame playerCount={players.length} />
        ) : (
          <QuestionPhase />
        )}
      </div>
      <div className="lg:col-span-1 space-y-4">
        <PlayerList
          players={players}
          scores={scores}
          currentPlayerId={currentPlayerId}
          questionWinnerId={questionWinnerId}
        />
        {/* Leave Room button */}
        <Button
          color="danger"
          variant="flat"
          className="w-full"
          onPress={onLeaveRoom}
        >
          Leave Room
        </Button>
      </div>
    </div>
  );
}

// Waiting for game to start component
interface WaitingForGameProps {
  playerCount: number;
}

function WaitingForGame({ playerCount }: WaitingForGameProps) {
  const roomName = useGameStore((state) => state.currentRoomName);
  const [factIndex, setFactIndex] = useState(() =>
    Math.floor(Math.random() * DID_YOU_KNOW_FACTS.length),
  );

  // Pick a new random fact every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex(Math.floor(Math.random() * DID_YOU_KNOW_FACTS.length));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const currentFact = DID_YOU_KNOW_FACTS[factIndex];

  return (
    <Card className="bg-gray-800/50 backdrop-blur">
      <CardBody className="p-8 text-center space-y-8">
        {/* Room Info */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {roomName || "Game Room"}
          </h2>
          <p className="text-gray-400">
            {playerCount > 0
              ? `${playerCount} player${playerCount !== 1 ? "s" : ""} in room`
              : "Joining room..."}
          </p>
        </div>

        {/* Loading indicator */}
        <div className="space-y-4">
          <LoadingDots />
          <p className="text-gray-400 text-lg animate-pulse">
            Waiting for next question...
          </p>
        </div>

        {/* Did you know */}
        <div className="bg-gray-700/50 rounded-xl p-6 max-w-lg mx-auto">
          <p className="text-primary-400 text-sm font-semibold mb-2">
            Did you know?
          </p>
          <p className="text-white text-lg leading-relaxed">
            {currentFact.text}
          </p>
          <a
            href={currentFact.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 text-xs hover:text-primary-400 mt-3 inline-block"
          >
            Source: {currentFact.source}
          </a>
        </div>
      </CardBody>
    </Card>
  );
}

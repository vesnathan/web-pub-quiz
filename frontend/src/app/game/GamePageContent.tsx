'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useGameStore } from '@/stores/gameStore';
import { useAuth } from '@/contexts/AuthContext';
import { QuestionPhase } from '@/components/game';
import type { Player, LeaderboardEntry, Question } from '@quiz/shared';
import { PlayerList } from '@/components/PlayerList';
import { QuestionResults } from '@/components/QuestionResults';
import { SetEndScreen, SetEndSidebar } from '@/components/SetEndScreen';
import { QuestionCountdown } from '@/components/QuestionCountdown';
import { BadgeAwardAnimation } from '@/components/badges';
import { useAbly } from '@/hooks/useAbly';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { GameBottomBar } from '@/components/GameBottomBar';
import { GameBackground } from '@/components/GameBackground';
import { SessionKickedOverlay } from '@/components/SessionKickedOverlay';

const JOIN_WINDOW_MS = 60 * 1000; // 1 minute before set start

export default function GamePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roomIdFromUrl = searchParams.get('roomId');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Minimal store access - use selectors for specific state
  const player = useGameStore((state) => state.player);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const scores = useGameStore((state) => state.scores);
  const players = useGameStore((state) => state.players);
  const currentRoomId = useGameStore((state) => state.currentRoomId);
  const setCurrentRoomId = useGameStore((state) => state.setCurrentRoomId);
  const isSetActive = useGameStore((state) => state.isSetActive);
  const nextSetTime = useGameStore((state) => state.nextSetTime);

  // For results phase
  const currentQuestion = useGameStore((state) => state.currentQuestion);
  const revealedAnswer = useGameStore((state) => state.revealedAnswer);
  const explanation = useGameStore((state) => state.explanation);
  const wasAnswered = useGameStore((state) => state.wasAnswered);
  const wasCorrect = useGameStore((state) => state.wasCorrect);
  const buzzerWinnerName = useGameStore((state) => state.buzzerWinnerName);
  const buzzerWinner = useGameStore((state) => state.buzzerWinner);
  const nextQuestionTime = useGameStore((state) => state.nextQuestionTime);
  const setLeaderboard = useGameStore((state) => state.setLeaderboard);
  const earnedBadgesThisQuestion = useGameStore((state) => state.earnedBadgesThisQuestion);
  const earnedBadgesThisSet = useGameStore((state) => state.earnedBadgesThisSet);

  // For overlays
  const pendingBadgeAward = useGameStore((state) => state.pendingBadgeAward);
  const setPendingBadgeAward = useGameStore((state) => state.setPendingBadgeAward);
  const setGamePhase = useGameStore((state) => state.setGamePhase);
  const setBuzzerState = useGameStore((state) => state.setBuzzerState);

  const [timeCheckDone, setTimeCheckDone] = useState(false);
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

  // Validate join window
  useEffect(() => {
    const now = Date.now();
    const timeUntilSet = nextSetTime - now;
    const canJoin = isSetActive || timeUntilSet <= JOIN_WINDOW_MS;

    if (!canJoin && !authLoading) {
      router.push('/');
      return;
    }

    setTimeCheckDone(true);
  }, [nextSetTime, isSetActive, authLoading, router]);

  // Auth and room validation
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
    } else if (!player && !authLoading) {
      router.push('/');
    } else if (!effectiveRoomId && !authLoading) {
      router.push('/rooms');
    }
  }, [player, router, isAuthenticated, authLoading, effectiveRoomId]);

  const handleBadgeAnimationComplete = useCallback(() => {
    setPendingBadgeAward(null);
  }, [setPendingBadgeAward]);

  const handleCountdownComplete = useCallback(() => {
    setBuzzerState(true, null, null, null);
    setGamePhase('question');
  }, [setBuzzerState, setGamePhase]);

  // Loading states
  if (authLoading || !timeCheckDone) {
    return <LoadingScreen />;
  }

  if (!player || !isAuthenticated) {
    return null;
  }

  const playerScore = scores[player.id] || 0;

  return (
    <GameBackground>
      {/* Main content with bottom padding for fixed bottom bar */}
      <main className="p-4 pb-20 flex-grow">
        <div className="max-w-7xl mx-auto">
          {gamePhase === 'set_end' ? (
            <SetEndLayout
              leaderboard={setLeaderboard}
              currentPlayerId={player.id}
              earnedBadgeIds={earnedBadgesThisSet}
            />
          ) : (
            <GameLayout
              gamePhase={gamePhase}
              players={players}
              scores={scores}
              currentPlayerId={player.id}
              buzzerWinnerId={buzzerWinner}
              currentQuestion={currentQuestion}
              revealedAnswer={revealedAnswer}
              explanation={explanation}
              wasAnswered={wasAnswered}
              wasCorrect={wasCorrect}
              buzzerWinnerName={buzzerWinnerName}
              nextQuestionTime={nextQuestionTime}
              leaderboard={setLeaderboard}
              earnedBadgeIds={earnedBadgesThisQuestion}
            />
          )}
        </div>
      </main>

      {/* Fixed bottom bar with game status and user menu */}
      <GameBottomBar playerScore={playerScore} />

      {/* Overlays */}
      {gamePhase === 'countdown' && (
        <QuestionCountdown onComplete={handleCountdownComplete} />
      )}
      <BadgeAwardAnimation
        badge={pendingBadgeAward}
        onComplete={handleBadgeAnimationComplete}
      />
      <SessionKickedOverlay />
    </GameBackground>
  );
}

// Set end layout component
interface SetEndLayoutProps {
  leaderboard: LeaderboardEntry[];
  currentPlayerId: string;
  earnedBadgeIds: string[];
}

function SetEndLayout({ leaderboard, currentPlayerId, earnedBadgeIds }: SetEndLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 min-h-[600px]">
        <SetEndScreen
          leaderboard={leaderboard}
          currentPlayerId={currentPlayerId}
          earnedBadgeIds={earnedBadgeIds}
        />
      </div>
      <div className="lg:col-span-1">
        <SetEndSidebar
          leaderboard={leaderboard}
          currentPlayerId={currentPlayerId}
        />
      </div>
    </div>
  );
}

// Main game layout component
interface GameLayoutProps {
  gamePhase: string;
  players: Player[];
  scores: Record<string, number>;
  currentPlayerId: string;
  buzzerWinnerId: string | null;
  currentQuestion: Omit<Question, 'correctIndex'> | null;
  revealedAnswer: number | null;
  explanation: string | null;
  wasAnswered: boolean;
  wasCorrect: boolean | null;
  buzzerWinnerName: string | null;
  nextQuestionTime: number | null;
  leaderboard: LeaderboardEntry[];
  earnedBadgeIds: string[];
}

function GameLayout({
  gamePhase,
  players,
  scores,
  currentPlayerId,
  buzzerWinnerId,
  currentQuestion,
  revealedAnswer,
  explanation,
  wasAnswered,
  wasCorrect,
  buzzerWinnerName,
  nextQuestionTime,
  leaderboard,
  earnedBadgeIds,
}: GameLayoutProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-6 min-h-[600px]">
        {gamePhase === 'results' ? (
          <QuestionResults
            question={currentQuestion}
            correctIndex={revealedAnswer}
            explanation={explanation}
            wasAnswered={wasAnswered}
            wasCorrect={wasCorrect}
            buzzerWinnerName={buzzerWinnerName}
            nextQuestionTime={nextQuestionTime}
            leaderboard={leaderboard}
            currentPlayerId={currentPlayerId}
            earnedBadgeIds={earnedBadgeIds}
          />
        ) : (
          <QuestionPhase />
        )}
      </div>
      <div className="lg:col-span-1">
        <PlayerList
          players={players}
          scores={scores}
          currentPlayerId={currentPlayerId}
          buzzerWinnerId={buzzerWinnerId}
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback } from "react";
import type Ably from "ably";
import { useGameStore } from "@/stores/gameStore";
import type {
  PlayerJoinedPayload,
  PlayerLeftPayload,
  QuestionStartPayload,
  AnswerPayload,
  QuestionEndPayload,
  SetEndPayload,
  ScoreUpdatePayload,
  WrongAnswerPayload,
} from "@quiz/shared";

interface GameEventHandlers {
  setupRoomSubscriptions: (channel: Ably.RealtimeChannel) => () => void;
  setupUserSubscriptions: (
    channel: Ably.RealtimeChannel,
    onKicked: () => void,
  ) => () => void;
  setupPresenceSubscriptions: (channel: Ably.RealtimeChannel) => () => void;
}

/**
 * Hook that provides game event handler functions
 * Separates event handling logic from connection management
 */
export function useGameEventHandlers(): GameEventHandlers {
  // Get store actions
  const setCurrentQuestion = useGameStore((state) => state.setCurrentQuestion);
  const setAnswerState = useGameStore((state) => state.setAnswerState);
  const updateScores = useGameStore((state) => state.updateScores);
  const addPlayer = useGameStore((state) => state.addPlayer);
  const removePlayer = useGameStore((state) => state.removePlayer);
  const setSetLeaderboard = useGameStore((state) => state.setSetLeaderboard);
  const setGamePhase = useGameStore((state) => state.setGamePhase);
  const setResultsState = useGameStore((state) => state.setResultsState);
  const clearResultsState = useGameStore((state) => state.clearResultsState);
  const addCompletedQuestion = useGameStore(
    (state) => state.addCompletedQuestion,
  );
  const clearCompletedQuestions = useGameStore(
    (state) => state.clearCompletedQuestions,
  );
  const setEarnedBadgesThisQuestion = useGameStore(
    (state) => state.setEarnedBadgesThisQuestion,
  );
  const addEarnedBadge = useGameStore((state) => state.addEarnedBadge);
  const clearEarnedBadges = useGameStore((state) => state.clearEarnedBadges);
  const setSessionKicked = useGameStore((state) => state.setSessionKicked);
  const setCountdown = useGameStore((state) => state.setCountdown);
  const clearCountdown = useGameStore((state) => state.clearCountdown);
  // Multi-guess state
  const addWrongGuess = useGameStore((state) => state.addWrongGuess);
  const setQuestionWinner = useGameStore((state) => state.setQuestionWinner);
  const resetQuestionState = useGameStore((state) => state.resetQuestionState);
  const setCorrectButSlow = useGameStore((state) => state.setCorrectButSlow);
  const setLastPoints = useGameStore((state) => state.setLastPoints);

  /**
   * Set up room channel event subscriptions
   */
  const setupRoomSubscriptions = useCallback(
    (channel: Ably.RealtimeChannel) => {
      // Player events
      channel.subscribe("player_joined", (message) => {
        const payload = message.data as PlayerJoinedPayload;
        addPlayer(payload.player);
      });

      channel.subscribe("player_left", (message) => {
        const payload = message.data as PlayerLeftPayload;
        removePlayer(payload.playerId);
      });

      // Set start - log for debugging
      channel.subscribe("set_start", (message) => {
        const payload = message.data as {
          setId: string;
          totalQuestions: number;
          playerCount: number;
          roomName: string;
        };
        console.log(
          `[GameEvents] SET_START received: setId=${payload.setId}, players=${payload.playerCount}, questions=${payload.totalQuestions}`,
        );
      });

      // Countdown events (3... 2... 1... GO!)
      channel.subscribe("countdown", (message) => {
        const payload = message.data as { count: number; message: string };
        console.log(
          `[GameEvents] COUNTDOWN: ${payload.count} - ${payload.message}`,
        );
        setCountdown(payload.count, payload.message);
      });

      // Question events
      channel.subscribe("question_start", (message) => {
        const payload = message.data as QuestionStartPayload;
        console.log(
          `[GameEvents] QUESTION_START received: Q${payload.questionIndex + 1}/${payload.totalQuestions}`,
        );

        // Clear countdown and state for new set
        clearCountdown();
        if (payload.questionIndex === 0) {
          clearCompletedQuestions();
          clearEarnedBadges();
        }

        setEarnedBadgesThisQuestion([]);
        clearResultsState();
        // Reset multi-guess state for new question
        resetQuestionState();
        setCurrentQuestion(
          payload.question,
          payload.questionIndex,
          payload.totalQuestions,
          payload.questionDuration,
          payload.answerTimeout,
        );
        setAnswerState(null, null, null);

        // Go straight to question phase - players can answer immediately
        setGamePhase("question");
      });

      // Answer events - when someone wins the question
      channel.subscribe("answer_result", (message) => {
        const payload = message.data as AnswerPayload;
        // When someone answers correctly, they win
        if (payload.isCorrect) {
          const state = useGameStore.getState();
          const player = state.players.find((p) => p.id === payload.playerId);
          setQuestionWinner(payload.playerId, player?.displayName || "Player");
        }
        setAnswerState(
          payload.answerIndex,
          payload.correctIndex,
          payload.isCorrect,
        );
      });

      // Question end
      channel.subscribe("question_end", (message) => {
        const payload = message.data as QuestionEndPayload;
        const state = useGameStore.getState();
        const question = state.currentQuestion;
        const currentPlayer = state.player;

        // Get per-player results if available, fallback to global
        const playerResult = currentPlayer?.id
          ? payload.playerResults?.[currentPlayer.id]
          : null;
        const userAnswered = playerResult?.answered ?? payload.wasAnswered;
        const userCorrect = playerResult?.correct ?? payload.wasCorrect;

        // Save completed question
        if (question || payload.questionText) {
          addCompletedQuestion({
            question:
              payload.questionText || question?.text || "Unknown question",
            options: payload.options || question?.options || [],
            correctIndex: payload.correctIndex,
            explanation: payload.explanation,
            detailedExplanation: payload.detailedExplanation,
            category: payload.category || question?.category,
            citationUrl: payload.citationUrl,
            citationTitle: payload.citationTitle,
            userAnswered,
            userCorrect,
          });
        }

        // Handle earned badges
        if (payload.earnedBadges && currentPlayer?.id) {
          const myBadges = payload.earnedBadges[currentPlayer.id] || [];
          setEarnedBadgesThisQuestion(myBadges);
          myBadges.forEach((badgeId: string) => addEarnedBadge(badgeId));
        }

        setAnswerState(null, payload.correctIndex, userCorrect);
        updateScores(payload.scores);
        setSetLeaderboard(payload.leaderboard);
        // Store winner info for display
        if (payload.winnerId && payload.winnerName) {
          setQuestionWinner(payload.winnerId, payload.winnerName);
        }
        // Set points for winner animation
        if (currentPlayer?.id === payload.winnerId && payload.winnerPoints) {
          setLastPoints(payload.winnerPoints);
        }
        setResultsState(
          payload.explanation,
          userAnswered,
          userCorrect,
          payload.nextQuestionIn,
        );
      });

      // Set end
      channel.subscribe("set_end", (message) => {
        const payload = message.data as SetEndPayload;
        const state = useGameStore.getState();
        const currentPlayer = state.player;

        console.log(
          `[GameEvents] SET_END received: ${payload.leaderboard.length} players on leaderboard`,
        );

        // Handle badges awarded at set end (e.g., "First Set Win", streak badges)
        if (payload.badgesSummary && currentPlayer?.id) {
          const myBadges = payload.badgesSummary[currentPlayer.id] || [];
          console.log(
            `[GameEvents] Set end badges for player: ${myBadges.length}`,
          );
          myBadges.forEach((badgeId: string) => addEarnedBadge(badgeId));
        }

        updateScores(payload.finalScores);
        setSetLeaderboard(payload.leaderboard);
        setGamePhase("set_end");
      });

      // Score updates
      channel.subscribe("score_update", (message) => {
        const payload = message.data as ScoreUpdatePayload;
        updateScores(payload.scores);
      });

      // Return cleanup function
      return () => {
        channel.unsubscribe("player_joined");
        channel.unsubscribe("player_left");
        channel.unsubscribe("set_start");
        channel.unsubscribe("question_start");
        channel.unsubscribe("answer_result");
        channel.unsubscribe("question_end");
        channel.unsubscribe("set_end");
        channel.unsubscribe("score_update");
      };
    },
    [
      addPlayer,
      removePlayer,
      setCurrentQuestion,
      setAnswerState,
      updateScores,
      setSetLeaderboard,
      setGamePhase,
      setResultsState,
      clearResultsState,
      addCompletedQuestion,
      clearCompletedQuestions,
      setEarnedBadgesThisQuestion,
      addEarnedBadge,
      clearEarnedBadges,
      resetQuestionState,
      setQuestionWinner,
      setLastPoints,
    ],
  );

  /**
   * Set up user channel subscriptions (session management + wrong answer events)
   */
  const setupUserSubscriptions = useCallback(
    (channel: Ably.RealtimeChannel, onKicked: () => void) => {
      channel.subscribe("session_kicked", (message) => {
        const { reason } = message.data as { reason: string };
        setSessionKicked(true, reason);
        onKicked();
      });

      // Handle wrong answer events (sent only to the player who guessed wrong)
      channel.subscribe("wrong_answer", (message) => {
        const payload = message.data as WrongAnswerPayload;
        console.log(
          `[GameEvents] WRONG_ANSWER: guess #${payload.guessCount}, penalty ${payload.penalty}`,
        );
        addWrongGuess(payload.answerIndex, payload.penalty);
      });

      // Handle correct but slow events (player got it right but wasn't first)
      channel.subscribe("correct_but_slow", (message) => {
        const { winnerName } = message.data as { winnerName: string };
        console.log(`[GameEvents] CORRECT_BUT_SLOW: ${winnerName} was faster`);
        setCorrectButSlow(winnerName);
      });

      return () => {
        channel.unsubscribe("session_kicked");
        channel.unsubscribe("wrong_answer");
        channel.unsubscribe("correct_but_slow");
      };
    },
    [setSessionKicked, addWrongGuess, setCorrectButSlow],
  );

  /**
   * Set up presence subscriptions
   */
  const setupPresenceSubscriptions = useCallback(
    (channel: Ably.RealtimeChannel) => {
      const presence = channel.presence;

      presence.subscribe("enter", (member) => {
        addPlayer({
          id: member.clientId!,
          displayName: member.data?.displayName || "Player",
          isAI: false,
          latency: 0,
          score: 0,
          correctCount: 0,
          wrongCount: 0,
          joinedAt: Date.now(),
        });
      });

      presence.subscribe("leave", (member) => {
        removePlayer(member.clientId!);
      });

      return () => {
        presence.unsubscribe("enter");
        presence.unsubscribe("leave");
      };
    },
    [addPlayer, removePlayer],
  );

  return {
    setupRoomSubscriptions,
    setupUserSubscriptions,
    setupPresenceSubscriptions,
  };
}

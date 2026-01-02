"use client";

import { useCallback } from "react";
import type Ably from "ably";
import { useGameStore } from "@/stores/gameStore";
import type {
  PlayerJoinedPayload,
  PlayerLeftPayload,
  QuestionStartPayload,
  BuzzPayload,
  AnswerPayload,
  QuestionEndPayload,
  SetEndPayload,
  ScoreUpdatePayload,
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
  const setBuzzerState = useGameStore((state) => state.setBuzzerState);
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

      // Question events
      channel.subscribe("question_start", (message) => {
        const payload = message.data as QuestionStartPayload;

        // Clear state for new set
        if (payload.questionIndex === 0) {
          clearCompletedQuestions();
          clearEarnedBadges();
        }

        setEarnedBadgesThisQuestion([]);
        clearResultsState();
        setCurrentQuestion(
          payload.question,
          payload.questionIndex,
          payload.totalQuestions,
          payload.questionDuration,
          payload.answerTimeout,
        );
        setAnswerState(null, null, null);

        // Go straight to question phase - no countdown that eats into question time
        setBuzzerState(true, null, null, null);
        setGamePhase("question");
      });

      // Buzzer events
      channel.subscribe("buzz_winner", (message) => {
        const payload = message.data as BuzzPayload;
        // Use dynamic answer timeout from store (set when question started)
        const answerTimeout = useGameStore.getState().answerTimeout;
        const deadline = Date.now() + answerTimeout;
        setBuzzerState(false, payload.playerId, payload.displayName, deadline);
        setGamePhase("answering");
      });

      // Answer events
      channel.subscribe("answer_result", (message) => {
        const payload = message.data as AnswerPayload;
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
            userAnswered: payload.wasAnswered,
            userCorrect: payload.wasCorrect,
          });
        }

        // Handle earned badges
        if (payload.earnedBadges && currentPlayer?.id) {
          const myBadges = payload.earnedBadges[currentPlayer.id] || [];
          setEarnedBadgesThisQuestion(myBadges);
          myBadges.forEach((badgeId: string) => addEarnedBadge(badgeId));
        }

        setAnswerState(null, payload.correctIndex, payload.wasCorrect);
        updateScores(payload.scores);
        setSetLeaderboard(payload.leaderboard);
        setBuzzerState(false, payload.winnerId, payload.winnerName, null);
        setResultsState(
          payload.explanation,
          payload.wasAnswered,
          payload.wasCorrect,
          payload.nextQuestionIn,
        );
      });

      // Set end
      channel.subscribe("set_end", (message) => {
        const payload = message.data as SetEndPayload;
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
        channel.unsubscribe("question_start");
        channel.unsubscribe("buzz_winner");
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
      setBuzzerState,
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
    ],
  );

  /**
   * Set up user channel subscriptions (session management)
   */
  const setupUserSubscriptions = useCallback(
    (channel: Ably.RealtimeChannel, onKicked: () => void) => {
      channel.subscribe("session_kicked", (message) => {
        const { reason } = message.data as { reason: string };
        setSessionKicked(true, reason);
        onKicked();
      });

      return () => {
        channel.unsubscribe("session_kicked");
      };
    },
    [setSessionKicked],
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

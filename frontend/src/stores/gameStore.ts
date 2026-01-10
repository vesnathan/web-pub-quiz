import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Player,
  Question,
  GameState,
  LeaderboardEntry,
  AwardBadge,
} from "@quiz/shared";

// Game phases (no "answering" phase - players answer during "question")
export type GamePhase =
  | "waiting"
  | "countdown"
  | "question"
  | "results"
  | "set_end"
  | "leaving";

interface GameStore {
  // Player state
  player: Player | null;
  setPlayer: (player: Player) => void;

  // Room state
  currentRoomId: string | null;
  currentRoomName: string | null;
  setCurrentRoomId: (roomId: string | null, roomName?: string | null) => void;

  // Session state (kicked from another session)
  sessionKicked: boolean;
  sessionKickedReason: string | null;
  setSessionKicked: (kicked: boolean, reason?: string) => void;

  // Guest quota exceeded
  quotaExceeded: boolean;
  quotaExceededMessage: string | null;
  setQuotaExceeded: (exceeded: boolean, message?: string) => void;

  // Game state
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;

  // Game phase
  gamePhase: GamePhase;
  setGamePhase: (phase: GamePhase) => void;

  // Countdown state (3... 2... 1... GO!)
  countdownNumber: number | null;
  countdownMessage: string | null;
  setCountdown: (count: number, message: string) => void;
  clearCountdown: () => void;

  // Current question
  currentQuestion: Omit<Question, "correctIndex"> | null;
  questionIndex: number;
  totalQuestions: number;
  questionDuration: number;
  answerTimeout: number;
  questionStartTime: number | null;
  setCurrentQuestion: (
    question: Omit<Question, "correctIndex"> | null,
    index: number,
    total?: number,
    duration?: number,
    answerTimeout?: number,
  ) => void;

  // Multi-guess state
  wrongGuesses: number[]; // Indices of wrong answers this question
  guessCount: number; // Number of guesses made
  lastPenalty: number | null; // For animation (negative)
  lastPoints: number | null; // For animation (positive - correct answer)
  questionWinner: string | null; // Who won this question
  questionWinnerName: string | null;
  gotCorrectButSlow: boolean; // Player got correct but wasn't first
  fasterWinnerName: string | null; // Name of player who was faster
  addWrongGuess: (answerIndex: number, penalty: number) => void;
  setQuestionWinner: (winnerId: string, winnerName: string) => void;
  setCorrectButSlow: (winnerName: string) => void;
  setLastPoints: (points: number) => void;
  resetQuestionState: () => void;

  // Answer state
  selectedAnswer: number | null;
  revealedAnswer: number | null;
  isCorrect: boolean | null;
  setAnswerState: (
    selected: number | null,
    revealed: number | null,
    correct: boolean | null,
  ) => void;

  // Results state
  explanation: string | null;
  wasAnswered: boolean;
  wasCorrect: boolean | null;
  nextQuestionTime: number | null;
  setResultsState: (
    explanation: string,
    wasAnswered: boolean,
    wasCorrect: boolean | null,
    nextQuestionIn: number,
  ) => void;
  clearResultsState: () => void;

  // Anti-cheat: track if user left the tab during question
  leftTabDuringQuestion: boolean;
  setLeftTabDuringQuestion: (left: boolean) => void;

  // Scores
  scores: Record<string, number>;
  updateScores: (scores: Record<string, number>) => void;

  // Set timing
  isSetActive: boolean;
  nextSetTime: number;
  setActiveTime: number | null;
  updateSetTiming: () => void;
  setSetActive: (active: boolean) => void;

  // Leaderboards
  setLeaderboard: LeaderboardEntry[];
  setSetLeaderboard: (entries: LeaderboardEntry[]) => void;

  // Latency tracking
  latency: number;
  latencySamples: number[];
  addLatencySample: (sample: number) => void;

  // Players in current set
  players: Player[];
  setPlayers: (players: Player[]) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;

  // Badge awards during set
  pendingBadgeAward: AwardBadge | null; // badge currently animating
  earnedBadgesThisSet: string[]; // badge IDs earned during current set
  earnedBadgesThisQuestion: string[]; // badge IDs earned during current question (for revolver)
  animatedBadgeIds: string[]; // badge IDs that have already been animated (to avoid re-animating)
  setPendingBadgeAward: (badge: AwardBadge | null) => void;
  addEarnedBadge: (badgeId: string) => void;
  setEarnedBadgesThisQuestion: (badgeIds: string[]) => void;
  markBadgesAsAnimated: (badgeIds: string[]) => void;
  clearEarnedBadges: () => void;

  // Completed questions for research/review
  completedQuestions: CompletedQuestion[];
  addCompletedQuestion: (question: CompletedQuestion) => void;
  clearCompletedQuestions: () => void;

  // Reset
  resetGame: () => void;
}

// Question with answer revealed for post-game review
export interface CompletedQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string; // Short explanation
  detailedExplanation?: string; // Longer explanation for research
  category?: string;
  citationUrl?: string;
  citationTitle?: string;
  userAnswered: boolean;
  userCorrect: boolean | null;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Player state
      player: null,
      setPlayer: (player) => set({ player }),

      // Room state
      currentRoomId: null,
      currentRoomName: null,
      setCurrentRoomId: (currentRoomId, currentRoomName = null) =>
        set({ currentRoomId, currentRoomName }),

      // Session state (kicked from another session)
      sessionKicked: false,
      sessionKickedReason: null,
      setSessionKicked: (sessionKicked, reason) =>
        set({ sessionKicked, sessionKickedReason: reason || null }),

      // Guest quota exceeded
      quotaExceeded: false,
      quotaExceededMessage: null,
      setQuotaExceeded: (quotaExceeded, message) =>
        set({ quotaExceeded, quotaExceededMessage: message || null }),

      // Game state
      gameState: null,
      setGameState: (gameState) => set({ gameState }),

      // Game phase
      gamePhase: "waiting" as GamePhase,
      setGamePhase: (gamePhase) => set({ gamePhase }),

      // Countdown state
      countdownNumber: null,
      countdownMessage: null,
      setCountdown: (countdownNumber, countdownMessage) =>
        set({ countdownNumber, countdownMessage, gamePhase: "countdown" }),
      clearCountdown: () =>
        set({ countdownNumber: null, countdownMessage: null }),

      // Current question
      currentQuestion: null,
      questionIndex: 0,
      totalQuestions: 20,
      questionDuration: 5000,
      answerTimeout: 4000,
      questionStartTime: null,
      setCurrentQuestion: (
        currentQuestion,
        questionIndex,
        totalQuestions = 20,
        questionDuration = 5000,
        answerTimeout = 4000,
      ) =>
        set({
          currentQuestion,
          questionIndex,
          totalQuestions,
          questionDuration,
          answerTimeout,
          questionStartTime: currentQuestion ? Date.now() : null,
        }),

      // Multi-guess state
      wrongGuesses: [],
      guessCount: 0,
      lastPenalty: null,
      lastPoints: null,
      questionWinner: null,
      questionWinnerName: null,
      gotCorrectButSlow: false,
      fasterWinnerName: null,
      addWrongGuess: (answerIndex, penalty) =>
        set((state) => ({
          wrongGuesses: [...state.wrongGuesses, answerIndex],
          guessCount: state.guessCount + 1,
          lastPenalty: penalty,
        })),
      setQuestionWinner: (questionWinner, questionWinnerName) =>
        set({ questionWinner, questionWinnerName }),
      setCorrectButSlow: (fasterWinnerName) =>
        set({ gotCorrectButSlow: true, fasterWinnerName }),
      setLastPoints: (lastPoints) => set({ lastPoints }),
      resetQuestionState: () =>
        set({
          wrongGuesses: [],
          guessCount: 0,
          lastPenalty: null,
          lastPoints: null,
          questionWinner: null,
          questionWinnerName: null,
          gotCorrectButSlow: false,
          fasterWinnerName: null,
          selectedAnswer: null,
          revealedAnswer: null,
          isCorrect: null,
        }),

      // Answer state
      selectedAnswer: null,
      revealedAnswer: null,
      isCorrect: null,
      setAnswerState: (selectedAnswer, revealedAnswer, isCorrect) =>
        set({ selectedAnswer, revealedAnswer, isCorrect }),

      // Results state
      explanation: null,
      wasAnswered: false,
      wasCorrect: null,
      nextQuestionTime: null,
      setResultsState: (explanation, wasAnswered, wasCorrect, nextQuestionIn) =>
        set({
          explanation,
          wasAnswered,
          wasCorrect,
          nextQuestionTime: Date.now() + nextQuestionIn,
          gamePhase: "results",
        }),
      clearResultsState: () =>
        set({
          explanation: null,
          wasAnswered: false,
          wasCorrect: null,
          nextQuestionTime: null,
          leftTabDuringQuestion: false, // Reset anti-cheat flag for new question
        }),

      // Anti-cheat
      leftTabDuringQuestion: false,
      setLeftTabDuringQuestion: (leftTabDuringQuestion) =>
        set({ leftTabDuringQuestion }),

      // Scores
      scores: {},
      updateScores: (scores) => set({ scores }),

      // Game timing (continuous play - always active)
      isSetActive: true,
      nextSetTime: 0,
      setActiveTime: null,
      updateSetTiming: () => {
        // No-op for continuous play
      },
      setSetActive: () => {
        // No-op for continuous play
      },

      // Leaderboards
      setLeaderboard: [],
      setSetLeaderboard: (setLeaderboard) => set({ setLeaderboard }),

      // Latency tracking
      latency: 0,
      latencySamples: [],
      addLatencySample: (sample) => {
        const { latencySamples } = get();
        const newSamples = [...latencySamples, sample].slice(-5);
        const avgLatency =
          newSamples.reduce((a, b) => a + b, 0) / newSamples.length;
        set({ latencySamples: newSamples, latency: Math.round(avgLatency) });
      },

      // Players
      players: [],
      setPlayers: (players) => set({ players }),
      addPlayer: (player) =>
        set((state) => ({
          players: [...state.players.filter((p) => p.id !== player.id), player],
        })),
      removePlayer: (playerId) =>
        set((state) => ({
          players: state.players.filter((p) => p.id !== playerId),
        })),

      // Badge awards
      pendingBadgeAward: null,
      earnedBadgesThisSet: [],
      earnedBadgesThisQuestion: [],
      animatedBadgeIds: [],
      setPendingBadgeAward: (pendingBadgeAward) => set({ pendingBadgeAward }),
      addEarnedBadge: (badgeId) =>
        set((state) => ({
          earnedBadgesThisSet: [...state.earnedBadgesThisSet, badgeId], // Don't dedupe - allow repeatable badges
        })),
      setEarnedBadgesThisQuestion: (earnedBadgesThisQuestion) =>
        set({ earnedBadgesThisQuestion }),
      markBadgesAsAnimated: (badgeIds) =>
        set((state) => ({
          animatedBadgeIds: [...state.animatedBadgeIds, ...badgeIds],
        })),
      clearEarnedBadges: () =>
        set({
          earnedBadgesThisSet: [],
          earnedBadgesThisQuestion: [],
          animatedBadgeIds: [],
          pendingBadgeAward: null,
        }),

      // Completed questions
      completedQuestions: [],
      addCompletedQuestion: (question) =>
        set((state) => ({
          completedQuestions: [...state.completedQuestions, question],
        })),
      clearCompletedQuestions: () => set({ completedQuestions: [] }),

      // Reset
      resetGame: () =>
        set({
          gameState: null,
          gamePhase: "waiting",
          currentQuestion: null,
          questionIndex: 0,
          totalQuestions: 20,
          questionDuration: 5000,
          answerTimeout: 4000,
          questionStartTime: null,
          // Multi-guess state
          wrongGuesses: [],
          guessCount: 0,
          lastPenalty: null,
          lastPoints: null,
          questionWinner: null,
          questionWinnerName: null,
          gotCorrectButSlow: false,
          fasterWinnerName: null,
          selectedAnswer: null,
          revealedAnswer: null,
          isCorrect: null,
          explanation: null,
          wasAnswered: false,
          wasCorrect: null,
          nextQuestionTime: null,
          leftTabDuringQuestion: false,
          scores: {},
          setLeaderboard: [],
          players: [],
          pendingBadgeAward: null,
          earnedBadgesThisSet: [],
          earnedBadgesThisQuestion: [],
          animatedBadgeIds: [],
          completedQuestions: [],
          sessionKicked: false,
          sessionKickedReason: null,
          quotaExceeded: false,
          quotaExceededMessage: null,
          currentRoomId: null,
          currentRoomName: null,
        }),
    }),
    {
      name: "quiz-game-storage",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null;
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return;
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return;
          sessionStorage.removeItem(name);
        },
      },
      partialize: (state) =>
        ({
          player: state.player,
        }) as GameStore,
    },
  ),
);

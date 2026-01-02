import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Player,
  Question,
  GameState,
  LeaderboardEntry,
  AwardBadge,
} from "@quiz/shared";
import { SET_DURATION_MINUTES } from "@quiz/shared";

// Game phases
export type GamePhase =
  | "waiting"
  | "countdown"
  | "question"
  | "answering"
  | "results"
  | "set_end";

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

  // Game state
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;

  // Game phase
  gamePhase: GamePhase;
  setGamePhase: (phase: GamePhase) => void;

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

  // Buzzer state
  buzzerEnabled: boolean;
  buzzerWinner: string | null;
  buzzerWinnerName: string | null;
  answerDeadline: number | null;
  setBuzzerState: (
    enabled: boolean,
    winner: string | null,
    winnerName: string | null,
    deadline: number | null,
  ) => void;

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
  setPendingBadgeAward: (badge: AwardBadge | null) => void;
  addEarnedBadge: (badgeId: string) => void;
  setEarnedBadgesThisQuestion: (badgeIds: string[]) => void;
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

function calculateNextSetTime(): number {
  const now = new Date();
  const currentMinutes = now.getMinutes();

  // Sets run every 30 minutes (at :00 and :30)
  // Each set runs for ~20 minutes (20 questions), then break until next half hour
  const nextSet = new Date(now);
  if (currentMinutes < 30) {
    // Next set starts at :30
    nextSet.setMinutes(30, 0, 0);
  } else {
    // Next set starts at :00 of next hour
    nextSet.setHours(nextSet.getHours() + 1, 0, 0, 0);
  }
  return nextSet.getTime();
}

function isCurrentlyInSet(): boolean {
  const now = new Date();
  const minutes = now.getMinutes();
  // Sets are active in the first ~20 minutes of each half hour
  // (0-19 and 30-49, though sets may end earlier if all questions done)
  return (minutes >= 0 && minutes < 20) || (minutes >= 30 && minutes < 50);
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

      // Game state
      gameState: null,
      setGameState: (gameState) => set({ gameState }),

      // Game phase
      gamePhase: "waiting" as GamePhase,
      setGamePhase: (gamePhase) => set({ gamePhase }),

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

      // Buzzer state
      buzzerEnabled: false,
      buzzerWinner: null,
      buzzerWinnerName: null,
      answerDeadline: null,
      setBuzzerState: (
        buzzerEnabled,
        buzzerWinner,
        buzzerWinnerName,
        answerDeadline,
      ) =>
        set({ buzzerEnabled, buzzerWinner, buzzerWinnerName, answerDeadline }),

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

      // Set timing
      isSetActive: isCurrentlyInSet(),
      nextSetTime: calculateNextSetTime(),
      setActiveTime: isCurrentlyInSet() ? Date.now() : null,
      updateSetTiming: () =>
        set({
          isSetActive: isCurrentlyInSet(),
          nextSetTime: calculateNextSetTime(),
          setActiveTime: isCurrentlyInSet() ? Date.now() : null,
        }),
      setSetActive: (active) =>
        set({
          isSetActive: active,
          setActiveTime: active ? Date.now() : null,
        }),

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
      setPendingBadgeAward: (pendingBadgeAward) => set({ pendingBadgeAward }),
      addEarnedBadge: (badgeId) =>
        set((state) => ({
          earnedBadgesThisSet: [...state.earnedBadgesThisSet, badgeId], // Don't dedupe - allow repeatable badges
        })),
      setEarnedBadgesThisQuestion: (earnedBadgesThisQuestion) =>
        set({ earnedBadgesThisQuestion }),
      clearEarnedBadges: () =>
        set({
          earnedBadgesThisSet: [],
          earnedBadgesThisQuestion: [],
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
          buzzerEnabled: false,
          buzzerWinner: null,
          buzzerWinnerName: null,
          answerDeadline: null,
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
          completedQuestions: [],
          sessionKicked: false,
          sessionKickedReason: null,
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

/**
 * Shared types for Quiz Night Live
 *
 * NOTE: For API/GraphQL types, use exports from gqlTypes (automatically generated from schema).
 * Types defined here are for internal orchestrator/real-time game logic.
 */

// ============================================
// Internal Orchestrator Types
// These are different from GraphQL types and used for real-time game state
// ============================================

/**
 * Internal question type with extra fields for game logic
 * (GraphQL Question is simpler - this has detailedExplanation, citations, etc.)
 */
export interface OrchestratorQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: QuestionCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
  detailedExplanation?: string;
  citationUrl?: string;
  citationTitle?: string;
}

export type QuestionCategory =
  | 'general'
  | 'science'
  | 'history'
  | 'geography'
  | 'entertainment'
  | 'sports'
  | 'arts'
  | 'literature';

/**
 * Internal game state for orchestrator (different from GraphQL GameState)
 */
export interface OrchestratorGameState {
  setId: string;
  currentQuestionIndex: number;
  currentQuestion: OrchestratorQuestion | null;
  questionStartTime: number | null;
  buzzerWinner: string | null;
  buzzerWinnerAnswerDeadline: number | null;
  questionStatus: 'waiting' | 'open' | 'buzzed' | 'answered' | 'timeout';
  players: Player[];
  setScores: Record<string, number>;
}

export interface QuizSet {
  id: string;
  startTime: string;
  endTime: string;
  questions: OrchestratorQuestion[];
  status: 'scheduled' | 'active' | 'completed';
}

export interface Player {
  id: string;
  displayName: string;
  isAI: boolean;
  latency: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  joinedAt: number;
}

export interface BuzzEvent {
  playerId: string;
  questionId: string;
  timestamp: number;
  latency: number;
  adjustedTimestamp: number;
}

export interface AnswerEvent {
  playerId: string;
  questionId: string;
  answerIndex: number;
  isCorrect: boolean;
  pointsAwarded: number;
}

// ============================================
// Ably Real-time Message Types
// ============================================

export interface AblyMessage {
  type: AblyMessageType;
  payload: unknown;
  timestamp: number;
}

export type AblyMessageType =
  | 'player_joined'
  | 'player_left'
  | 'question_start'
  | 'buzz'
  | 'answer'
  | 'question_end'
  | 'set_end'
  | 'score_update'
  | 'badge_awarded'
  | 'latency_ping'
  | 'latency_pong';

export interface PlayerJoinedPayload {
  player: Player;
}

export interface PlayerLeftPayload {
  playerId: string;
}

export interface QuestionStartPayload {
  question: Omit<OrchestratorQuestion, 'correctIndex' | 'explanation'>;
  questionIndex: number;
  totalQuestions: number;
  questionDuration: number;
  answerTimeout: number;
}

export interface BuzzPayload {
  playerId: string;
  displayName: string;
  adjustedTimestamp: number;
}

export interface AnswerPayload {
  playerId: string;
  answerIndex: number;
  isCorrect: boolean;
  correctIndex: number;
  pointsAwarded: number;
}

export interface QuestionEndPayload {
  correctIndex: number;
  explanation: string;
  scores: Record<string, number>;
  leaderboard: import('./gqlTypes').LeaderboardEntry[];
  winnerId: string | null;
  winnerName: string | null;
  wasAnswered: boolean;
  wasCorrect: boolean | null;
  nextQuestionIn: number;
  questionText?: string;
  options?: string[];
  category?: string;
  detailedExplanation?: string;
  citationUrl?: string;
  citationTitle?: string;
  earnedBadges?: Record<string, string[]>;
}

export interface SetEndPayload {
  finalScores: Record<string, number>;
  leaderboard: import('./gqlTypes').LeaderboardEntry[];
  badgesSummary?: Record<string, string[]>;
}

export interface ScoreUpdatePayload {
  scores: Record<string, number>;
}

// ============================================
// Re-exports
// ============================================

// GraphQL types (source of truth for API)
export * from './gqlTypes';

// Awards system (excluding AwardRarity which is in gqlTypes)
export {
  type AwardBadge,
  type AwardGroup,
  type BadgeAwardEvent,
  type SetBadgeSummary,
  type UserBadgeRecord,
  SKILL_POINTS_BY_RARITY,
  AWARD_GROUPS,
  getAllBadges,
  getBadgeById,
  getGroupById,
  getHighestBadgeInGroup,
  calculateTotalSkillPoints,
  getBadgesToDisplay,
  getRarityColor,
  getRarityGradient,
} from './awards';

// Room types
export * from './room';

// Subscription types (excluding SubscriptionStatus/Provider which are in gqlTypes)
export {
  type SubscriptionTier,
  SUBSCRIPTION_TIERS,
  SUBSCRIPTION_TIER_NAMES,
  SUBSCRIPTION_TIER_PRICES,
  type SubscriptionInfo,
  DEFAULT_SUBSCRIPTION_INFO,
  type SubscriptionFeatures,
  getSubscriptionFeatures,
  FREE_TIER_DAILY_SET_LIMIT,
  type StripeWebhookEvent,
  type PayPalWebhookEvent,
  type CreateCheckoutRequest,
  type CreateCheckoutResponse,
} from './subscription';

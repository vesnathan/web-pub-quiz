export interface User {
  id: string;
  displayName: string;
  createdAt: string;
  stats: UserStats;
  badges: Badge[];
  currentStreak: number;
  longestStreak: number;
  isAI?: boolean;
}

export interface UserStats {
  totalCorrect: number;
  totalWrong: number;
  totalPoints: number;
  setsPlayed: number;
  setsWon: number;
  perfectSets: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export type BadgeType =
  | 'streak_3_wins'
  | 'streak_7_days'
  | 'streak_10_correct'
  | 'streak_month'
  | 'first_win'
  | 'correct_100'
  | 'correct_1000'
  | 'correct_10000'
  | 'sets_50'
  | 'positive_week'
  | 'perfect_set'
  | 'trigger_happy'
  | 'late_winner'
  | 'comeback_king';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: QuestionCategory;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string; // Short explanation for question end screen
  detailedExplanation?: string; // Longer explanation for research/review section
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

export interface QuizSet {
  id: string;
  startTime: string;
  endTime: string;
  questions: Question[];
  status: 'scheduled' | 'active' | 'completed';
}

export interface GameState {
  setId: string;
  currentQuestionIndex: number;
  currentQuestion: Question | null;
  questionStartTime: number | null;
  buzzerWinner: string | null;
  buzzerWinnerAnswerDeadline: number | null;
  questionStatus: 'waiting' | 'open' | 'buzzed' | 'answered' | 'timeout';
  players: Player[];
  setScores: Record<string, number>;
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

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  score: number;
  correctCount?: number;
  wrongCount?: number;
  avatarUrl?: string;
  memberSince?: string;
}

export type LeaderboardType = 'set' | 'daily' | 'weekly' | 'allTime';

export interface Leaderboard {
  type: LeaderboardType;
  entries: LeaderboardEntry[];
  updatedAt: string;
  userRank?: number;
  userEntry?: LeaderboardEntry;
}

// Ably channel message types
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
  question: Omit<Question, 'correctIndex' | 'explanation'>;
  questionIndex: number;
  totalQuestions: number;
  questionDuration: number; // ms until question ends if no buzz
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
  leaderboard: LeaderboardEntry[];
  winnerId: string | null;
  winnerName: string | null;
  wasAnswered: boolean;
  wasCorrect: boolean | null;
  nextQuestionIn: number; // ms until next question
  // Question details for post-game review
  questionText?: string;
  options?: string[];
  category?: string;
  detailedExplanation?: string;
  citationUrl?: string;
  citationTitle?: string;
  // Badges earned by players on this question
  earnedBadges?: Record<string, string[]>; // playerId -> badgeIds earned this question
}

export interface SetEndPayload {
  finalScores: Record<string, number>;
  leaderboard: LeaderboardEntry[];
  badgesSummary?: Record<string, string[]>; // playerId -> badgeIds earned this set
}

export interface ScoreUpdatePayload {
  scores: Record<string, number>;
}

// Re-export generated GraphQL types
export * from './gqlTypes';

// Re-export awards system
export * from './awards';

// Re-export room types
export * from './room';

// Re-export subscription types
export * from './subscription';

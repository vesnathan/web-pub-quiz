// Scoring by question difficulty
export const DIFFICULTY_POINTS = {
  easy: { correct: 50, wrong: -200 },
  medium: { correct: 75, wrong: -100 },
  hard: { correct: 100, wrong: -50 },
} as const;

// Game timing
export const SET_DURATION_MINUTES = 30;
export const SET_BREAK_MINUTES = 30;
export const QUESTIONS_PER_SET = 20;
export const BETWEEN_QUESTIONS_MS = 3000;

// Dynamic timing configuration
// Reading speed: ~4 words per second for quick scanning in a quiz context
export const WORDS_PER_SECOND = 4;
export const MIN_QUESTION_DISPLAY_MS = 4000; // Minimum time to read question
export const MAX_QUESTION_DISPLAY_MS = 12000; // Maximum time for very long questions
export const MIN_ANSWER_TIMEOUT_MS = 4000; // Minimum time to answer
export const MAX_ANSWER_TIMEOUT_MS = 10000; // Maximum time for long options

// Legacy fixed constants (kept for backwards compatibility)
export const ANSWER_TIMEOUT_MS = 4000;
export const QUESTION_DISPLAY_MS = 5000;

/**
 * Calculate time needed to read question text and options
 * @param questionText - The question text
 * @param options - Array of answer options
 * @returns Time in milliseconds to display question before buzzer opens
 */
export function calculateQuestionDisplayTime(
  questionText: string,
  options: string[]
): number {
  // Count words in question
  const questionWords = questionText.trim().split(/\s+/).length;

  // Count words in all options
  let optionWords = 0;
  for (const option of options) {
    optionWords += option.trim().split(/\s+/).length;
  }

  const totalWords = questionWords + optionWords;
  const readingTimeMs = (totalWords / WORDS_PER_SECOND) * 1000;

  // Add 1 second buffer for processing
  const totalTime = readingTimeMs + 1000;

  // Clamp between min and max
  if (totalTime < MIN_QUESTION_DISPLAY_MS) return MIN_QUESTION_DISPLAY_MS;
  if (totalTime > MAX_QUESTION_DISPLAY_MS) return MAX_QUESTION_DISPLAY_MS;
  return Math.round(totalTime);
}

/**
 * Calculate time allowed to answer after buzzing
 * Based on length of options (longer options = more time to re-read and decide)
 * @param options - Array of answer options
 * @returns Time in milliseconds allowed to select an answer
 */
export function calculateAnswerTimeout(options: string[]): number {
  // Count words in all options
  let optionWords = 0;
  for (const option of options) {
    optionWords += option.trim().split(/\s+/).length;
  }

  // Base time + reading time for options
  // We're more generous here since player already read them once
  const readingTimeMs = (optionWords / (WORDS_PER_SECOND * 1.5)) * 1000;
  const totalTime = MIN_ANSWER_TIMEOUT_MS + readingTimeMs;

  // Clamp between min and max
  if (totalTime < MIN_ANSWER_TIMEOUT_MS) return MIN_ANSWER_TIMEOUT_MS;
  if (totalTime > MAX_ANSWER_TIMEOUT_MS) return MAX_ANSWER_TIMEOUT_MS;
  return Math.round(totalTime);
}

// Players
export const MIN_PLAYERS = 8;
export const MAX_LATENCY_COMPENSATION_MS = 300;

// Rooms
export const MAX_PLAYERS_PER_ROOM = 20;
export const INITIAL_ROOMS_COUNT = 3; // Number of rooms to create each half-hour
export const ROOM_RESERVE_TIMEOUT_MS = 30 * 60 * 1000; // Reserve spot for disconnected player until set ends
export const JOIN_WINDOW_SECONDS = 60; // Players can join 1 minute before set starts


// Buzzer
export const LATENCY_SAMPLE_SIZE = 5;

// Leaderboard
export const LEADERBOARD_SIZE = 100;

// Badge thresholds
export const BADGE_THRESHOLDS = {
  streak_3_wins: 3,
  streak_7_days: 7,
  streak_10_correct: 10,
  streak_month: 30,
  correct_100: 100,
  correct_1000: 1000,
  correct_10000: 10000,
  sets_50: 50,
} as const;

// Categories
export const QUESTION_CATEGORIES = [
  'general',
  'science',
  'history',
  'geography',
  'entertainment',
  'sports',
  'arts',
  'literature',
] as const;

// Ably channel names
export const ABLY_CHANNELS = {
  LOBBY: 'quiz:lobby', // Room list updates for all users
  ROOM_PREFIX: 'quiz:room:', // Per-room game events: quiz:room:{roomId}
  USER_PREFIX: 'quiz:user:', // User-specific channel, followed by userId
  // Legacy channels (kept for backwards compatibility during migration)
  GAME: 'quiz:game',
  PRESENCE: 'quiz:presence',
  BUZZER: 'quiz:buzzer',
} as const;

// DynamoDB table names (will be prefixed with stage)
export const TABLE_NAMES = {
  USERS: 'quiz-users',
  QUESTIONS: 'quiz-questions',
  SETS: 'quiz-sets',
  SCORES: 'quiz-scores',
  LEADERBOARDS: 'quiz-leaderboards',
} as const;

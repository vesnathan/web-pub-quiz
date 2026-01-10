/**
 * Game configuration stored in DynamoDB
 * Editable via admin settings page, no deployment required
 */

export interface DifficultyPointsConfig {
  correct: number;
  wrong: number;
}

export interface GameConfig {
  // Room settings
  maxPlayersPerRoom: number;
  playersPerRoomThreshold: number; // When to create new rooms

  // Timing
  resultsDisplayMs: number;
  questionDurationMs: number;

  // Free tier limits
  freeTierDailyLimit: number;

  // Scoring
  difficultyPoints: {
    easy: DifficultyPointsConfig;
    medium: DifficultyPointsConfig;
    hard: DifficultyPointsConfig;
  };

  // Maintenance
  maintenanceMode: boolean;
  maintenanceMessage: string | null;

  // Payment settings
  stripeTestMode: boolean; // Use Stripe test/sandbox keys instead of production

  // Metadata
  updatedAt: string;
  updatedBy?: string;
}

/**
 * Default game configuration
 * Used when no config exists in DynamoDB
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxPlayersPerRoom: 20,
  playersPerRoomThreshold: 20,
  resultsDisplayMs: 5000,
  questionDurationMs: 10000,
  freeTierDailyLimit: 50,
  difficultyPoints: {
    easy: { correct: 50, wrong: -200 },
    medium: { correct: 75, wrong: -100 },
    hard: { correct: 100, wrong: -50 },
  },
  maintenanceMode: false,
  maintenanceMessage: null,
  stripeTestMode: false,
  updatedAt: new Date().toISOString(),
};

// DynamoDB keys for game config
export const GAME_CONFIG_PK = "CONFIG#game";
export const GAME_CONFIG_SK = "SETTINGS";

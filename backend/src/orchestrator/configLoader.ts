/**
 * Game Config Loader
 * Loads game configuration from DynamoDB with caching and auto-refresh
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  GameConfig,
  DEFAULT_GAME_CONFIG,
  GAME_CONFIG_PK,
  GAME_CONFIG_SK,
} from '@quiz/shared';

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = process.env.TABLE_NAME || 'quiz-night-live-datatable-prod';

// Cache config in memory
let cachedConfig: GameConfig | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // Refresh every 60 seconds

/**
 * Load game config from DynamoDB
 * Creates default config if none exists
 */
export async function loadGameConfig(): Promise<GameConfig> {
  const now = Date.now();

  // Return cached config if still valid
  if (cachedConfig && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: GAME_CONFIG_PK, SK: GAME_CONFIG_SK },
      })
    );

    if (result.Item) {
      // Parse the config from DynamoDB
      cachedConfig = {
        maxPlayersPerRoom: result.Item.maxPlayersPerRoom ?? DEFAULT_GAME_CONFIG.maxPlayersPerRoom,
        playersPerRoomThreshold: result.Item.playersPerRoomThreshold ?? DEFAULT_GAME_CONFIG.playersPerRoomThreshold,
        resultsDisplayMs: result.Item.resultsDisplayMs ?? DEFAULT_GAME_CONFIG.resultsDisplayMs,
        questionDurationMs: result.Item.questionDurationMs ?? DEFAULT_GAME_CONFIG.questionDurationMs,
        freeTierDailyLimit: result.Item.freeTierDailyLimit ?? DEFAULT_GAME_CONFIG.freeTierDailyLimit,
        difficultyPoints: result.Item.difficultyPoints ?? DEFAULT_GAME_CONFIG.difficultyPoints,
        maintenanceMode: result.Item.maintenanceMode ?? DEFAULT_GAME_CONFIG.maintenanceMode,
        maintenanceMessage: result.Item.maintenanceMessage ?? DEFAULT_GAME_CONFIG.maintenanceMessage,
        updatedAt: result.Item.updatedAt ?? DEFAULT_GAME_CONFIG.updatedAt,
        updatedBy: result.Item.updatedBy,
      };
      lastFetchTime = now;
      console.log('📋 Loaded game config from DynamoDB');
      return cachedConfig;
    }

    // No config exists - create default
    console.log('📋 No game config found, creating default...');
    await saveGameConfig(DEFAULT_GAME_CONFIG);
    cachedConfig = DEFAULT_GAME_CONFIG;
    lastFetchTime = now;
    return cachedConfig;
  } catch (error) {
    console.error('Failed to load game config:', error);
    // Return cached or default on error
    return cachedConfig ?? DEFAULT_GAME_CONFIG;
  }
}

/**
 * Save game config to DynamoDB
 */
export async function saveGameConfig(config: GameConfig): Promise<void> {
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: GAME_CONFIG_PK,
          SK: GAME_CONFIG_SK,
          ...config,
          updatedAt: new Date().toISOString(),
        },
      })
    );
    // Update cache
    cachedConfig = config;
    lastFetchTime = Date.now();
    console.log('📋 Saved game config to DynamoDB');
  } catch (error) {
    console.error('Failed to save game config:', error);
    throw error;
  }
}

/**
 * Force refresh config from DynamoDB
 */
export async function refreshConfig(): Promise<GameConfig> {
  lastFetchTime = 0; // Invalidate cache
  return loadGameConfig();
}

/**
 * Get current cached config (or load if not cached)
 */
export function getConfig(): GameConfig {
  return cachedConfig ?? DEFAULT_GAME_CONFIG;
}

/**
 * Check if maintenance mode is enabled
 */
export function isMaintenanceMode(): boolean {
  return cachedConfig?.maintenanceMode ?? false;
}

/**
 * Get maintenance message
 */
export function getMaintenanceMessage(): string | null {
  return cachedConfig?.maintenanceMessage ?? null;
}

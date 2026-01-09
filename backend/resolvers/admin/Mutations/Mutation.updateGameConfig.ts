import { Context, util } from '@aws-appsync/utils';

type Identity = {
  sub?: string;
  username?: string;
  groups?: string[];
};

type DifficultyPointsInput = {
  correct: number;
  wrong: number;
};

type Args = {
  input: {
    maxPlayersPerRoom?: number;
    playersPerRoomThreshold?: number;
    resultsDisplayMs?: number;
    questionDurationMs?: number;
    freeTierDailyLimit?: number;
    difficultyPoints?: {
      easy: DifficultyPointsInput;
      medium: DifficultyPointsInput;
      hard: DifficultyPointsInput;
    };
    maintenanceMode?: boolean;
    maintenanceMessage?: string | null;
  };
};

/**
 * Admin-only mutation to update game configuration.
 * Changes take effect within 60 seconds (orchestrator refresh interval).
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as Identity | undefined;
  const groups = identity?.groups || [];

  // Check if user is admin
  let isAdmin = false;
  for (const group of groups) {
    if (group === 'SiteAdmin') {
      isAdmin = true;
    }
  }

  if (!isAdmin) {
    return util.error('Unauthorized: Admin access required', 'UnauthorizedException');
  }

  const { input } = ctx.arguments;
  const now = util.time.nowISO8601();
  const updatedBy = identity?.username || identity?.sub || 'unknown';

  // Build update expression dynamically based on provided fields
  const expressionParts: string[] = [];
  const expressionNames: Record<string, string> = {};
  const expressionValues: Record<string, unknown> = {};

  if (input.maxPlayersPerRoom !== undefined) {
    expressionParts.push('#maxPlayersPerRoom = :maxPlayersPerRoom');
    expressionNames['#maxPlayersPerRoom'] = 'maxPlayersPerRoom';
    expressionValues[':maxPlayersPerRoom'] = input.maxPlayersPerRoom;
  }

  if (input.playersPerRoomThreshold !== undefined) {
    expressionParts.push('#playersPerRoomThreshold = :playersPerRoomThreshold');
    expressionNames['#playersPerRoomThreshold'] = 'playersPerRoomThreshold';
    expressionValues[':playersPerRoomThreshold'] = input.playersPerRoomThreshold;
  }

  if (input.resultsDisplayMs !== undefined) {
    expressionParts.push('#resultsDisplayMs = :resultsDisplayMs');
    expressionNames['#resultsDisplayMs'] = 'resultsDisplayMs';
    expressionValues[':resultsDisplayMs'] = input.resultsDisplayMs;
  }

  if (input.questionDurationMs !== undefined) {
    expressionParts.push('#questionDurationMs = :questionDurationMs');
    expressionNames['#questionDurationMs'] = 'questionDurationMs';
    expressionValues[':questionDurationMs'] = input.questionDurationMs;
  }

  if (input.freeTierDailyLimit !== undefined) {
    expressionParts.push('#freeTierDailyLimit = :freeTierDailyLimit');
    expressionNames['#freeTierDailyLimit'] = 'freeTierDailyLimit';
    expressionValues[':freeTierDailyLimit'] = input.freeTierDailyLimit;
  }

  if (input.difficultyPoints !== undefined) {
    expressionParts.push('#difficultyPoints = :difficultyPoints');
    expressionNames['#difficultyPoints'] = 'difficultyPoints';
    expressionValues[':difficultyPoints'] = input.difficultyPoints;
  }

  if (input.maintenanceMode !== undefined) {
    expressionParts.push('#maintenanceMode = :maintenanceMode');
    expressionNames['#maintenanceMode'] = 'maintenanceMode';
    expressionValues[':maintenanceMode'] = input.maintenanceMode;
  }

  if (input.maintenanceMessage !== undefined) {
    expressionParts.push('#maintenanceMessage = :maintenanceMessage');
    expressionNames['#maintenanceMessage'] = 'maintenanceMessage';
    expressionValues[':maintenanceMessage'] = input.maintenanceMessage;
  }

  // Always update metadata
  expressionParts.push('#updatedAt = :updatedAt');
  expressionNames['#updatedAt'] = 'updatedAt';
  expressionValues[':updatedAt'] = now;

  expressionParts.push('#updatedBy = :updatedBy');
  expressionNames['#updatedBy'] = 'updatedBy';
  expressionValues[':updatedBy'] = updatedBy;

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: 'CONFIG#game',
      SK: 'SETTINGS',
    }),
    update: {
      expression: `SET ${expressionParts.join(', ')}`,
      expressionNames,
      expressionValues: util.dynamodb.toMapValues(expressionValues),
    },
  };
}

type ConfigItem = {
  maxPlayersPerRoom?: number;
  playersPerRoomThreshold?: number;
  resultsDisplayMs?: number;
  questionDurationMs?: number;
  freeTierDailyLimit?: number;
  difficultyPoints?: {
    easy: { correct: number; wrong: number };
    medium: { correct: number; wrong: number };
    hard: { correct: number; wrong: number };
  };
  maintenanceMode?: boolean;
  maintenanceMessage?: string | null;
  updatedAt?: string;
  updatedBy?: string;
};

export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const item = ctx.result as ConfigItem | null;

  // Return default values merged with whatever was updated
  return {
    maxPlayersPerRoom: item?.maxPlayersPerRoom || 20,
    playersPerRoomThreshold: item?.playersPerRoomThreshold || 20,
    resultsDisplayMs: item?.resultsDisplayMs || 5000,
    questionDurationMs: item?.questionDurationMs || 10000,
    freeTierDailyLimit: item?.freeTierDailyLimit || 50,
    difficultyPoints: item?.difficultyPoints || {
      easy: { correct: 50, wrong: -200 },
      medium: { correct: 75, wrong: -100 },
      hard: { correct: 100, wrong: -50 },
    },
    maintenanceMode: item?.maintenanceMode || false,
    maintenanceMessage: item?.maintenanceMessage || null,
    updatedAt: item?.updatedAt || util.time.nowISO8601(),
    updatedBy: item?.updatedBy || null,
  };
}

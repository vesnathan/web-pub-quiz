import { util, Context } from '@aws-appsync/utils';

/**
 * Query.getRoomList - Fetches the room list state from DynamoDB
 * Written by orchestrator every 10 seconds
 */

export function request(ctx: Context) {
  return {
    operation: 'GetItem',
    key: util.dynamodb.toMapValues({
      PK: 'ROOMS#lobby',
      SK: 'STATE',
    }),
  };
}

export function response(ctx: Context) {
  const result = ctx.result;

  if (!result) {
    // No room data yet - return empty state
    return {
      rooms: [],
      lobbyPlayerCount: 0,
      maintenanceMode: false,
      maintenanceMessage: null,
      updatedAt: util.time.nowISO8601(),
    };
  }

  // Transform rooms to ensure inProgress has a default value
  const sourceRooms = result.rooms || [];
  const transformedRooms: {
    id: string;
    name: string;
    status: string;
    difficulty: string;
    currentPlayers: number;
    maxPlayers: number;
    inProgress: boolean;
    currentQuestion: number | null;
  }[] = [];

  for (const room of sourceRooms) {
    transformedRooms.push({
      id: room.id,
      name: room.name,
      status: room.status,
      difficulty: room.difficulty,
      currentPlayers: room.currentPlayers || 0,
      maxPlayers: room.maxPlayers || 20,
      inProgress: room.inProgress === true || room.status === 'in_progress',
      currentQuestion: room.currentQuestion !== undefined ? room.currentQuestion : null,
    });
  }

  return {
    rooms: transformedRooms,
    lobbyPlayerCount: result.lobbyPlayerCount || 0,
    maintenanceMode: result.maintenanceMode || false,
    maintenanceMessage: result.maintenanceMessage,
    updatedAt: result.updatedAt || util.time.nowISO8601(),
  };
}

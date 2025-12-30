import { v4 as uuidv4 } from 'uuid';
import type { Room, RoomListItem, RoomDifficulty, RoomStatus } from '@quiz/shared';
import {
  ROOM_NAME_ADJECTIVES,
  ROOM_NAME_NOUNS,
  MAX_PLAYERS_PER_ROOM,
  INITIAL_ROOMS_COUNT,
} from '@quiz/shared';

// In-memory room storage
const rooms: Map<string, Room> = new Map();

// Track reserved spots for disconnected players: roomId -> { playerId -> expiryTimestamp }
const reservedSpots: Map<string, Map<string, number>> = new Map();

/**
 * Generate a quiz-themed room name like "Bright Scholars" or "Quick Minds"
 */
export function generateRoomName(): string {
  const adjective = ROOM_NAME_ADJECTIVES[Math.floor(Math.random() * ROOM_NAME_ADJECTIVES.length)];
  const noun = ROOM_NAME_NOUNS[Math.floor(Math.random() * ROOM_NAME_NOUNS.length)];
  return `${adjective} ${noun}`;
}

/**
 * Create a new room with the given difficulty
 */
export function createRoom(difficulty: RoomDifficulty = 'medium'): Room {
  const room: Room = {
    id: uuidv4(),
    name: generateRoomName(),
    difficulty,
    maxPlayers: MAX_PLAYERS_PER_ROOM,
    currentPlayers: 0,
    status: 'waiting',
    createdAt: new Date().toISOString(),
    setId: null,
  };

  rooms.set(room.id, room);
  reservedSpots.set(room.id, new Map());

  console.log(`🏠 Created room: ${room.name} (${room.id})`);
  return room;
}

/**
 * Get a room by ID
 */
export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

/**
 * Get the number of reserved spots for a room
 */
function getReservedCount(roomId: string): number {
  const roomReserved = reservedSpots.get(roomId);
  if (!roomReserved) return 0;
  return roomReserved.size;
}

/**
 * Try to join a room. Returns true if successful, false if room is full.
 */
export function joinRoom(roomId: string, playerId: string): boolean {
  const room = rooms.get(roomId);
  if (!room) {
    console.log(`❌ Room not found: ${roomId}`);
    return false;
  }

  // Check if player has a reserved spot
  const roomReserved = reservedSpots.get(roomId);
  if (roomReserved?.has(playerId)) {
    // Player is rejoining with their reserved spot
    roomReserved.delete(playerId);
    room.currentPlayers++;
    console.log(`🔄 Player ${playerId} rejoined room ${room.name} (reserved spot)`);
    return true;
  }

  // Check if room has space (counting reserved spots)
  const effectivePlayers = room.currentPlayers + getReservedCount(roomId);
  if (effectivePlayers >= room.maxPlayers) {
    console.log(`❌ Room ${room.name} is full (${effectivePlayers}/${room.maxPlayers})`);
    return false;
  }

  room.currentPlayers++;
  console.log(`👤 Player ${playerId} joined room ${room.name} (${room.currentPlayers}/${room.maxPlayers})`);
  return true;
}

/**
 * Leave a room. If reserve=true, the player's spot is held for reconnection.
 */
export function leaveRoom(roomId: string, playerId: string, reserve: boolean = false): void {
  const room = rooms.get(roomId);
  if (!room) return;

  room.currentPlayers = Math.max(0, room.currentPlayers - 1);

  if (reserve && room.status === 'in_progress') {
    // Reserve spot until set ends (30 minutes from now max)
    const roomReserved = reservedSpots.get(roomId) || new Map();
    const expiryTime = Date.now() + 30 * 60 * 1000; // 30 minutes
    roomReserved.set(playerId, expiryTime);
    reservedSpots.set(roomId, roomReserved);
    console.log(`📌 Reserved spot for ${playerId} in room ${room.name}`);
  } else {
    console.log(`👋 Player ${playerId} left room ${room.name} (${room.currentPlayers}/${room.maxPlayers})`);
  }
}

/**
 * Update room status
 */
export function setRoomStatus(roomId: string, status: RoomStatus, setId?: string): void {
  const room = rooms.get(roomId);
  if (!room) return;

  room.status = status;
  if (setId !== undefined) {
    room.setId = setId;
  }

  console.log(`📊 Room ${room.name} status: ${status}`);
}

/**
 * Get list of all active rooms (not completed)
 */
export function getRoomList(): RoomListItem[] {
  return Array.from(rooms.values())
    .filter((room) => room.status !== 'completed')
    .map((room) => ({
      id: room.id,
      name: room.name,
      difficulty: room.difficulty,
      currentPlayers: room.currentPlayers,
      queuedPlayers: 0, // Will be populated by orchestrator with actual queue data
      maxPlayers: room.maxPlayers,
      status: room.status,
    }))
    .sort((a, b) => {
      // Sort by status (waiting first), then by player count (most players first)
      if (a.status !== b.status) {
        return a.status === 'waiting' ? -1 : 1;
      }
      return b.currentPlayers - a.currentPlayers;
    });
}

/**
 * Get all room IDs
 */
export function getAllRoomIds(): string[] {
  return Array.from(rooms.keys());
}

/**
 * Merge small rooms before set starts.
 * Rooms are merged if their combined player count is <= MAX_PLAYERS_PER_ROOM.
 */
export function mergeSmallRooms(): void {
  const waitingRooms = Array.from(rooms.values())
    .filter((room) => room.status === 'waiting' && room.currentPlayers > 0)
    .sort((a, b) => a.currentPlayers - b.currentPlayers);

  if (waitingRooms.length < 2) return;

  // Simple merge: try to merge smallest room into next smallest
  for (let i = 0; i < waitingRooms.length - 1; i++) {
    const smallRoom = waitingRooms[i];
    const targetRoom = waitingRooms[i + 1];

    const combined = smallRoom.currentPlayers + targetRoom.currentPlayers;
    if (combined <= MAX_PLAYERS_PER_ROOM) {
      // Merge smallRoom into targetRoom
      console.log(`🔀 Merging room ${smallRoom.name} (${smallRoom.currentPlayers}) into ${targetRoom.name} (${targetRoom.currentPlayers})`);

      targetRoom.currentPlayers = combined;
      smallRoom.currentPlayers = 0;
      smallRoom.status = 'completed'; // Mark for cleanup

      // Move reserved spots too
      const smallReserved = reservedSpots.get(smallRoom.id);
      const targetReserved = reservedSpots.get(targetRoom.id) || new Map();
      if (smallReserved) {
        for (const [playerId, expiry] of smallReserved) {
          targetReserved.set(playerId, expiry);
        }
      }
      reservedSpots.set(targetRoom.id, targetReserved);
      reservedSpots.delete(smallRoom.id);
    }
  }
}

/**
 * Clean up expired reservations
 */
export function cleanupExpiredReservations(): void {
  const now = Date.now();

  for (const [roomId, roomReserved] of reservedSpots) {
    for (const [playerId, expiry] of roomReserved) {
      if (now > expiry) {
        roomReserved.delete(playerId);
        console.log(`⏰ Expired reservation for ${playerId} in room ${roomId}`);
      }
    }
  }
}

/**
 * Create fresh rooms for a new half-hour period.
 * Clears completed rooms and creates initial rooms.
 */
export function createRoomsForNewHalfHour(): void {
  console.log('\n🔄 Creating rooms for new half-hour...');

  // Clear completed rooms
  for (const [roomId, room] of rooms) {
    if (room.status === 'completed') {
      rooms.delete(roomId);
      reservedSpots.delete(roomId);
      console.log(`🗑️  Cleaned up room: ${room.name}`);
    }
  }

  // Mark any remaining in_progress rooms as completed
  for (const room of rooms.values()) {
    if (room.status === 'in_progress') {
      room.status = 'completed';
    }
  }

  // Create initial rooms (all medium difficulty for MVP)
  for (let i = 0; i < INITIAL_ROOMS_COUNT; i++) {
    createRoom('medium');
  }

  console.log(`✅ Created ${INITIAL_ROOMS_COUNT} new rooms\n`);
}

/**
 * Find or create a room with available space.
 * Used when a player joins without selecting a specific room.
 */
export function findAvailableRoom(): Room | null {
  // Find a waiting room with space
  for (const room of rooms.values()) {
    if (room.status === 'waiting') {
      const effectivePlayers = room.currentPlayers + getReservedCount(room.id);
      if (effectivePlayers < room.maxPlayers) {
        return room;
      }
    }
  }

  // All rooms full or in progress - create a new one
  return createRoom('medium');
}

/**
 * Clear all reserved spots for a room (called when set ends)
 */
export function clearRoomReservations(roomId: string): void {
  reservedSpots.delete(roomId);
}

/**
 * Get room statistics for logging
 */
export function getRoomStats(): { total: number; waiting: number; inProgress: number; totalPlayers: number } {
  let waiting = 0;
  let inProgress = 0;
  let totalPlayers = 0;

  for (const room of rooms.values()) {
    if (room.status === 'waiting') waiting++;
    if (room.status === 'in_progress') inProgress++;
    totalPlayers += room.currentPlayers;
  }

  return {
    total: rooms.size,
    waiting,
    inProgress,
    totalPlayers,
  };
}

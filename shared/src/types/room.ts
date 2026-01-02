// Room types for multi-room quiz game

export type RoomDifficulty = 'easy' | 'medium' | 'hard';
export type RoomStatus = 'waiting' | 'in_progress' | 'completed';

export interface Room {
  id: string;
  name: string;
  difficulty: RoomDifficulty;
  maxPlayers: number;
  currentPlayers: number;
  status: RoomStatus;
  createdAt: string;
  setId: string | null;
}

// Lightweight version for list display
export interface RoomListItem {
  id: string;
  name: string;
  difficulty: RoomDifficulty;
  currentPlayers: number;
  queuedPlayers: number; // Players waiting to join when window opens
  maxPlayers: number;
  status: RoomStatus;
  disabled?: boolean; // If true, room is not joinable (not enough online players)
  disabledReason?: string; // Reason for being disabled
}

// Players per room - add a new room for every N players online
export const PLAYERS_PER_ROOM_THRESHOLD = 20;

// Quiz-themed room name components
export const ROOM_NAME_ADJECTIVES = [
  'Bright',
  'Quick',
  'Sharp',
  'Clever',
  'Swift',
  'Bold',
  'Wise',
  'Keen',
  'Eager',
  'Agile',
  'Brilliant',
  'Curious',
  'Daring',
  'Fearless',
] as const;

export const ROOM_NAME_NOUNS = [
  'Scholars',
  'Minds',
  'Titans',
  'Wizards',
  'Champions',
  'Masters',
  'Experts',
  'Prodigies',
  'Mavens',
  'Geniuses',
  'Thinkers',
  'Savants',
] as const;

// Ably payloads for room events
export interface RoomListPayload {
  rooms: RoomListItem[];
}

export interface JoinRoomPayload {
  roomId: string;
  playerId: string;
  displayName: string;
}

export interface LeaveRoomPayload {
  roomId: string;
  playerId: string;
  reserve: boolean; // If true, reserve spot for reconnection
}

export interface RoomUpdatePayload {
  room: RoomListItem;
}

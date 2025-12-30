import Ably from 'ably';
import express from 'express';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import {
  ABLY_CHANNELS,
  SET_DURATION_MINUTES,
  QUESTIONS_PER_SET,
  ANSWER_TIMEOUT_MS,
  QUESTION_DISPLAY_MS,
  MAX_LATENCY_COMPENSATION_MS,
  MAX_PLAYERS_PER_ROOM,
  POINTS_CORRECT,
  POINTS_WRONG,
  JOIN_WINDOW_SECONDS,
} from '@quiz/shared';
import type {
  Question,
  Player,
  QuestionStartPayload,
  BuzzPayload,
  AnswerPayload,
  QuestionEndPayload,
  SetEndPayload,
  LeaderboardEntry,
  BadgeType,
  RoomListItem,
} from '@quiz/shared';
import { getMockQuestions } from './mockQuestions';
import { allBadges, getEarnedBadges, type UserStats as BadgeUserStats } from './badges';
import { getQuestionsForSet, markQuestionAnsweredCorrectly, prewarmQuestionCache } from './questionGenerator';
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  getRoomList,
  setRoomStatus,
  getAllRoomIds,
  findAvailableRoom,
  clearRoomReservations,
  getRoomStats,
} from './roomManager';
import type { QuestionCategory, Room } from '@quiz/shared';

// ============ Health Check Server ============
const HEALTH_PORT = 8080;
let isHealthy = true;
let isShuttingDown = false;
let lastHeartbeat = Date.now();

const healthApp = express();
healthApp.get('/health', (_req, res) => {
  const ablyConnected = ably?.connection.state === 'connected';
  const heartbeatRecent = Date.now() - lastHeartbeat < 60000;

  if (isHealthy && ablyConnected && heartbeatRecent && !isShuttingDown) {
    res.status(200).json({
      status: 'healthy',
      ablyConnected,
      lastHeartbeat: new Date(lastHeartbeat).toISOString(),
      uptime: process.uptime(),
      rooms: getRoomStats(),
    });
  } else {
    res.status(503).json({
      status: 'unhealthy',
      ablyConnected,
      lastHeartbeat: new Date(lastHeartbeat).toISOString(),
      isShuttingDown,
    });
  }
});

// ============ Graceful Shutdown ============
async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`\n🛑 ${signal} received. Starting graceful shutdown...`);
  isShuttingDown = true;
  isHealthy = false;

  await sleep(5000);

  // End all room sessions gracefully
  for (const [roomId, session] of roomSessions) {
    console.log(`📤 Ending set in room ${roomId}...`);
    try {
      await endRoomSet(roomId);
    } catch (e) {
      console.error(`Error ending set in room ${roomId}:`, e);
    }
  }

  // Notify clients via lobby
  if (lobbyChannel) {
    try {
      await lobbyChannel.publish('orchestrator_shutdown', {
        message: 'Server restarting, please wait...',
      });
    } catch (e) {
      console.error('Failed to publish shutdown message:', e);
    }
  }

  if (ably) {
    console.log('🔌 Closing Ably connection...');
    ably.close();
  }

  console.log('✅ Graceful shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ============ Global Error Handlers ============
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  isHealthy = false;
  setTimeout(() => {
    console.error('Exiting due to uncaught exception...');
    process.exit(1);
  }, 10000);
});

// DynamoDB setup
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = process.env.TABLE_NAME || 'wpq-datatable-prod';

// Timing constants
const RESULTS_DISPLAY_MS = 12000;

// ============ DynamoDB Helper Functions ============

async function updateUserStats(
  userId: string,
  displayName: string,
  isCorrect: boolean,
  points: number
): Promise<BadgeUserStats> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        UpdateExpression: `
          SET stats.totalCorrect = if_not_exists(stats.totalCorrect, :zero) + :correct,
              stats.totalWrong = if_not_exists(stats.totalWrong, :zero) + :wrong,
              stats.totalPoints = if_not_exists(stats.totalPoints, :zero) + :points,
              stats.currentStreak = if_not_exists(stats.currentStreak, :zero) + :streakDelta,
              stats.longestStreak = if_not_exists(stats.longestStreak, :zero),
              displayName = if_not_exists(displayName, :displayName)
        `,
        ExpressionAttributeValues: {
          ':zero': 0,
          ':correct': isCorrect ? 1 : 0,
          ':wrong': isCorrect ? 0 : 1,
          ':points': points,
          ':streakDelta': isCorrect ? 1 : 0,
          ':displayName': displayName,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    const stats = result.Attributes?.stats || {};
    let currentStreak = stats.currentStreak || 0;
    let longestStreak = stats.longestStreak || 0;

    if (!isCorrect && currentStreak > 0) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
          UpdateExpression: 'SET stats.currentStreak = :zero',
          ExpressionAttributeValues: { ':zero': 0 },
        })
      );
      currentStreak = 0;
    }

    if (isCorrect && currentStreak > longestStreak) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
          UpdateExpression: 'SET stats.longestStreak = :streak',
          ExpressionAttributeValues: { ':streak': currentStreak },
        })
      );
      longestStreak = currentStreak;
    }

    return {
      totalCorrect: stats.totalCorrect || 0,
      totalWrong: stats.totalWrong || 0,
      totalPoints: stats.totalPoints || 0,
      currentStreak,
      longestStreak,
      setsPlayed: stats.setsPlayed || 0,
      setsWon: stats.setsWon || 0,
      perfectSets: stats.perfectSets || 0,
    };
  } catch (error) {
    console.error(`Failed to update stats for ${userId}:`, error);
    return {
      totalCorrect: 0,
      totalWrong: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      setsPlayed: 0,
      setsWon: 0,
      perfectSets: 0,
    };
  }
}

async function updateLeaderboardEntry(
  leaderboardType: 'daily' | 'weekly' | 'alltime',
  userId: string,
  displayName: string,
  pointsDelta: number
): Promise<void> {
  try {
    const now = new Date();
    let pk: string;

    if (leaderboardType === 'daily') {
      const dateStr = now.toISOString().split('T')[0];
      pk = `LEADERBOARD#daily#${dateStr}`;
    } else if (leaderboardType === 'weekly') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      pk = `LEADERBOARD#weekly#${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    } else {
      pk = 'LEADERBOARD#alltime';
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: pk, SK: `USER#${userId}` },
        UpdateExpression: `
          SET score = if_not_exists(score, :zero) + :points,
              displayName = :displayName,
              userId = :userId,
              username = :displayName,
              updatedAt = :now
        `,
        ExpressionAttributeValues: {
          ':zero': 0,
          ':points': pointsDelta,
          ':displayName': displayName,
          ':userId': userId,
          ':now': now.toISOString(),
        },
      })
    );
  } catch (error) {
    console.error(`Failed to update ${leaderboardType} leaderboard for ${userId}:`, error);
  }
}

async function updateAllLeaderboards(
  userId: string,
  displayName: string,
  points: number
): Promise<void> {
  await Promise.all([
    updateLeaderboardEntry('daily', userId, displayName, points),
    updateLeaderboardEntry('weekly', userId, displayName, points),
    updateLeaderboardEntry('alltime', userId, displayName, points),
  ]);
}

async function awardBadge(
  userId: string,
  badgeType: BadgeType,
  name: string,
  description: string,
  icon: string,
  repeatable: boolean = false
): Promise<boolean> {
  try {
    if (!repeatable) {
      const user = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
          ProjectionExpression: 'badges',
        })
      );

      const existingBadges = user.Item?.badges || [];
      if (existingBadges.some((b: { id: string }) => b.id === badgeType)) {
        return false;
      }
    }

    const badge = {
      id: badgeType,
      name,
      description,
      icon,
      earnedAt: new Date().toISOString(),
    };

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        UpdateExpression: 'SET badges = list_append(if_not_exists(badges, :empty), :badge)',
        ExpressionAttributeValues: {
          ':badge': [badge],
          ':empty': [],
        },
      })
    );

    console.log(`🏅 Awarded badge "${name}" to user ${userId}`);
    return true;
  } catch (error) {
    console.error(`Failed to award badge ${badgeType} to ${userId}:`, error);
    return false;
  }
}

async function checkAndAwardBadges(
  userId: string,
  stats: BadgeUserStats
): Promise<string[]> {
  const earnedBadges = getEarnedBadges(stats);
  const newlyEarnedBadgeIds: string[] = [];

  for (const badge of earnedBadges) {
    const wasNew = await awardBadge(
      userId,
      badge.id as BadgeType,
      badge.name,
      badge.description,
      badge.icon,
      badge.repeatable || false
    );
    if (wasNew) {
      newlyEarnedBadgeIds.push(badge.id);
    }
  }

  return newlyEarnedBadgeIds;
}

async function updateSetStats(userId: string, won: boolean, isPerfectSet: boolean): Promise<string[]> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        UpdateExpression: `
          SET stats.setsPlayed = if_not_exists(stats.setsPlayed, :zero) + :one,
              stats.setsWon = if_not_exists(stats.setsWon, :zero) + :won,
              stats.perfectSets = if_not_exists(stats.perfectSets, :zero) + :perfect
        `,
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':won': won ? 1 : 0,
          ':perfect': isPerfectSet ? 1 : 0,
        },
        ReturnValues: 'ALL_NEW',
      })
    );

    const stats = result.Attributes?.stats || {};
    const badgeStats: BadgeUserStats = {
      totalCorrect: stats.totalCorrect || 0,
      totalWrong: stats.totalWrong || 0,
      totalPoints: stats.totalPoints || 0,
      currentStreak: stats.currentStreak || 0,
      longestStreak: stats.longestStreak || 0,
      setsPlayed: stats.setsPlayed || 0,
      setsWon: stats.setsWon || 0,
      perfectSets: stats.perfectSets || 0,
    };

    return await checkAndAwardBadges(userId, badgeStats);
  } catch (error) {
    console.error(`Failed to update set stats for ${userId}:`, error);
    return [];
  }
}

// ============ Room Session State ============

interface RoomSession {
  roomId: string;
  setId: string;
  questions: Question[];
  currentQuestionIndex: number;
  players: Map<string, Player>;
  scores: Map<string, number>;
  buzzes: Map<string, { timestamp: number; latency: number }>;
  currentBuzzWinner: string | null;
  answerDeadline: number | null;
  questionStartTime: number | null;
  answerReceived: boolean;
  lastAnswerCorrect: boolean | null;
  questionPhase: 'waiting' | 'question' | 'answering' | 'results';
  pendingBadges: Map<string, string[]>;
  setEarnedBadges: Map<string, string[]>;
  playerCorrectCount: Map<string, number>;
  playerWrongCount: Map<string, number>;
  questionsUsed: Set<string>;
  channel: Ably.RealtimeChannel;
  setCompleted: boolean;
}

// Multi-room state
const roomSessions: Map<string, RoomSession> = new Map();
const roomChannels: Map<string, Ably.RealtimeChannel> = new Map();

let ably: Ably.Realtime | null = null;
let lobbyChannel: Ably.RealtimeChannel | null = null;
let questionCachePrewarmed = false;

// Track players in lobby (waiting to join a room)
const lobbyPlayers: Map<string, { displayName: string; joinedAt: number }> = new Map();

// Track players queued to join each room when window opens
// roomId -> Set of playerIds
const roomQueues: Map<string, Set<string>> = new Map();

/**
 * Check if current time is within the join window
 * Join is allowed when:
 * 1. Any room has an active game session (set in progress), OR
 * 2. We're within JOIN_WINDOW_SECONDS before the next half hour (:00 or :30)
 */
function isJoinWindowOpen(): { canJoin: boolean; reason?: string; secondsUntilOpen?: number } {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const secondsInHalfHour = (minutes % 30) * 60 + seconds;

  // If any room has an active game session, allow joining
  const hasActiveSession = roomSessions.size > 0 &&
    Array.from(roomSessions.values()).some(session => !session.setCompleted);

  if (hasActiveSession) {
    console.log(`🚪 Join window CHECK: OPEN (active session) - time=${now.toISOString()}, activeSessions=${roomSessions.size}`);
    return { canJoin: true };
  }

  // Check if we're in the join window (last JOIN_WINDOW_SECONDS before next half hour)
  const secondsUntilNextHalfHour = 30 * 60 - secondsInHalfHour;
  if (secondsUntilNextHalfHour <= JOIN_WINDOW_SECONDS) {
    console.log(`🚪 Join window CHECK: OPEN (pre-set window) - time=${now.toISOString()}, secondsUntilNextHalfHour=${secondsUntilNextHalfHour}, JOIN_WINDOW_SECONDS=${JOIN_WINDOW_SECONDS}`);
    return { canJoin: true };
  }

  console.log(`🚪 Join window CHECK: CLOSED - time=${now.toISOString()}, secondsUntilNextHalfHour=${secondsUntilNextHalfHour}, secondsUntilOpen=${secondsUntilNextHalfHour - JOIN_WINDOW_SECONDS}`);
  return {
    canJoin: false,
    reason: 'Joining is only available 1 minute before the next set starts',
    secondsUntilOpen: secondsUntilNextHalfHour - JOIN_WINDOW_SECONDS,
  };
}

// ============ Ably Initialization ============

function initAbly(): void {
  const ablyKey = process.env.ABLY_API_KEY || process.env.NEXT_PUBLIC_ABLY_KEY;

  if (!ablyKey) {
    console.error('ABLY_API_KEY not set');
    process.exit(1);
  }

  ably = new Ably.Realtime({
    key: ablyKey,
    clientId: 'game-orchestrator',
  });

  ably.connection.on('connected', () => {
    console.log('✅ Connected to Ably');
  });

  ably.connection.on('failed', (err) => {
    console.error('❌ Ably connection failed:', err);
  });

  // Setup lobby channel
  lobbyChannel = ably.channels.get(ABLY_CHANNELS.LOBBY);
  setupLobbyPresence();

  // Create initial room
  const initialRoom = createRoom('medium');
  setupRoomChannel(initialRoom.id);
  console.log(`🏠 Created initial room: ${initialRoom.name}`);
}

function setupLobbyPresence(): void {
  if (!lobbyChannel) return;

  const presence = lobbyChannel.presence;

  presence.subscribe('enter', async (member) => {
    const playerId = member.clientId!;
    const displayName = member.data?.displayName || 'Anonymous';

    lobbyPlayers.set(playerId, {
      displayName,
      joinedAt: Date.now(),
    });

    console.log(`👤 Player entered lobby: ${displayName} (${lobbyPlayers.size} in lobby)`);

    // Pre-warm question cache on first player
    if (!questionCachePrewarmed) {
      questionCachePrewarmed = true;
      console.log(`🔥 First player joined lobby - pre-warming question cache...`);
      prewarmQuestionCache('general', QUESTIONS_PER_SET * 2).catch(err =>
        console.error('Failed to pre-warm question cache:', err)
      );
    }

    // Broadcast updated room list
    await broadcastRoomList();
  });

  presence.subscribe('leave', async (member) => {
    const playerId = member.clientId!;
    const player = lobbyPlayers.get(playerId);
    lobbyPlayers.delete(playerId);

    console.log(`👋 Player left lobby: ${player?.displayName || playerId} (${lobbyPlayers.size} in lobby)`);
    await broadcastRoomList();
  });

  // Handle request_room_list - client requests initial room list on connect
  lobbyChannel.subscribe('request_room_list', async (message) => {
    const { clientId } = message.data;
    console.log(`📋 Room list requested by ${clientId}`);
    await broadcastRoomList();
  });

  // Handle room join requests
  lobbyChannel.subscribe('join_room', async (message) => {
    const { playerId, roomId, displayName } = message.data;
    console.log(`📥 JOIN_ROOM request: playerId=${playerId}, roomId=${roomId}, displayName=${displayName}`);

    // Check if join window is open
    const joinWindow = isJoinWindowOpen();
    console.log(`📥 JOIN_ROOM window check: canJoin=${joinWindow.canJoin}, reason=${joinWindow.reason}, secondsUntilOpen=${joinWindow.secondsUntilOpen}`);
    if (!joinWindow.canJoin) {
      console.log(`❌ JOIN_ROOM REJECTED: window closed for ${displayName}`);
      await lobbyChannel!.publish('join_room_result', {
        playerId,
        success: false,
        error: joinWindow.reason,
        secondsUntilOpen: joinWindow.secondsUntilOpen,
      });
      return;
    }

    const room = getRoom(roomId);
    if (!room) {
      await lobbyChannel!.publish('join_room_result', {
        playerId,
        success: false,
        error: 'Room not found',
      });
      return;
    }

    const success = joinRoom(roomId, playerId);
    if (success) {
      console.log(`✅ ${displayName} joined room ${room.name}`);
      await broadcastRoomList();
    }

    await lobbyChannel!.publish('join_room_result', {
      playerId,
      success,
      roomId: success ? roomId : undefined,
      roomName: success ? room.name : undefined,
      error: success ? undefined : 'Room is full',
    });
  });

  // Handle auto-join (find any available room)
  lobbyChannel.subscribe('auto_join', async (message) => {
    const { playerId, displayName } = message.data;

    // Check if join window is open
    const joinWindow = isJoinWindowOpen();
    if (!joinWindow.canJoin) {
      await lobbyChannel!.publish('join_room_result', {
        playerId,
        success: false,
        error: joinWindow.reason,
        secondsUntilOpen: joinWindow.secondsUntilOpen,
      });
      return;
    }

    let room = findAvailableRoom();

    // If all rooms are full or in progress, create a new one
    if (!room || room.currentPlayers >= MAX_PLAYERS_PER_ROOM) {
      room = createRoom('medium');
      setupRoomChannel(room.id);
      console.log(`🏠 Created new room (overflow): ${room.name}`);
    }

    const success = joinRoom(room.id, playerId);

    await lobbyChannel!.publish('join_room_result', {
      playerId,
      success,
      roomId: success ? room.id : undefined,
      roomName: success ? room.name : undefined,
      error: success ? undefined : 'Failed to join room',
    });

    if (success) {
      console.log(`✅ ${displayName} auto-joined room ${room.name}`);
      await broadcastRoomList();
    }
  });

  // Handle queue_join - player wants to join a room when window opens
  lobbyChannel.subscribe('queue_join', async (message) => {
    const { playerId, roomId } = message.data;
    console.log(`⏳ QUEUE_JOIN: playerId=${playerId}, roomId=${roomId}`);

    // Add to room's queue
    if (!roomQueues.has(roomId)) {
      roomQueues.set(roomId, new Set());
    }
    roomQueues.get(roomId)!.add(playerId);

    await lobbyChannel!.publish('queue_join_result', {
      playerId,
      roomId,
      success: true,
      queuePosition: roomQueues.get(roomId)!.size,
    });

    // Broadcast updated room list with new queue count
    await broadcastRoomList();
  });

  // Handle queue_leave - player no longer wants to auto-join
  lobbyChannel.subscribe('queue_leave', async (message) => {
    const { playerId, roomId } = message.data;
    console.log(`⏳ QUEUE_LEAVE: playerId=${playerId}, roomId=${roomId}`);

    const queue = roomQueues.get(roomId);
    if (queue) {
      queue.delete(playerId);
      if (queue.size === 0) {
        roomQueues.delete(roomId);
      }
    }

    await lobbyChannel!.publish('queue_leave_result', {
      playerId,
      roomId,
      success: true,
    });

    // Broadcast updated room list with new queue count
    await broadcastRoomList();
  });
}

function setupRoomChannel(roomId: string): void {
  if (!ably) return;

  const channelName = `${ABLY_CHANNELS.ROOM_PREFIX}${roomId}`;
  const channel = ably.channels.get(channelName);
  roomChannels.set(roomId, channel);

  const presence = channel.presence;

  // Track players entering the room channel
  presence.subscribe('enter', async (member) => {
    const playerId = member.clientId!;
    const displayName = member.data?.displayName || 'Anonymous';
    const session = roomSessions.get(roomId);

    if (session) {
      const player: Player = {
        id: playerId,
        displayName,
        isAI: false,
        latency: 0,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        joinedAt: Date.now(),
      };
      session.players.set(playerId, player);
      if (!session.scores.has(playerId)) {
        session.scores.set(playerId, 0);
      }
      console.log(`👤 ${displayName} entered room ${roomId} (${session.players.size} players)`);
    }
  });

  presence.subscribe('leave', async (member) => {
    const playerId = member.clientId!;
    const session = roomSessions.get(roomId);

    if (session) {
      const player = session.players.get(playerId);
      session.players.delete(playerId);

      // Reserve spot if game is in progress
      const room = getRoom(roomId);
      if (room && room.status === 'in_progress') {
        leaveRoom(roomId, playerId, true); // Reserve spot
      } else {
        leaveRoom(roomId, playerId, false);
      }

      console.log(`👋 ${player?.displayName || playerId} left room ${roomId}`);
      await broadcastRoomList();
    }
  });

  // Handle buzzes for this room
  channel.subscribe('buzz', async (message) => {
    await handleRoomBuzz(roomId, message.data);
  });

  // Handle answers for this room
  channel.subscribe('answer', async (message) => {
    await handleRoomAnswer(roomId, message.data);
  });

  console.log(`📡 Setup channel for room ${roomId}`);
}

async function broadcastRoomList(): Promise<void> {
  if (!lobbyChannel) return;

  const baseRooms = getRoomList();
  const joinWindow = isJoinWindowOpen();

  // Add queuedPlayers count to each room
  const rooms: RoomListItem[] = baseRooms.map(room => ({
    ...room,
    queuedPlayers: roomQueues.get(room.id)?.size || 0,
  }));

  const payload = {
    rooms,
    joinWindowOpen: joinWindow.canJoin,
    secondsUntilJoinOpen: joinWindow.secondsUntilOpen,
  };

  console.log(`📢 BROADCAST room_list: joinWindowOpen=${payload.joinWindowOpen}, secondsUntilJoinOpen=${payload.secondsUntilJoinOpen}, roomCount=${rooms.length}`);

  await lobbyChannel.publish('room_list', payload);
}

// ============ Room Game Logic ============

function buildRoomLeaderboard(roomId: string): LeaderboardEntry[] {
  const session = roomSessions.get(roomId);
  if (!session) return [];

  return Array.from(session.scores.entries())
    .map(([id, score]) => {
      const player = session.players.get(id);
      return {
        rank: 0,
        userId: id,
        displayName: player?.displayName || 'Unknown',
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

interface BuzzData {
  playerId: string;
  displayName?: string;
  timestamp: number;
  latency?: number;
}

async function handleRoomBuzz(roomId: string, data: BuzzData): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session || session.questionPhase !== 'question') return;
  if (session.currentBuzzWinner) return;

  const { playerId, displayName: buzzDisplayName, timestamp, latency } = data;
  const compensatedLatency = Math.min(latency || 0, MAX_LATENCY_COMPENSATION_MS);
  const adjustedTimestamp = timestamp - compensatedLatency / 2;

  session.buzzes.set(playerId, { timestamp: adjustedTimestamp, latency: latency || 0 });

  let earliestPlayerId = playerId;
  let earliestTimestamp = adjustedTimestamp;

  session.buzzes.forEach((buzz, id) => {
    if (buzz.timestamp < earliestTimestamp) {
      earliestTimestamp = buzz.timestamp;
      earliestPlayerId = id;
    }
  });

  if (earliestPlayerId === playerId) {
    session.currentBuzzWinner = playerId;
    session.answerDeadline = Date.now() + ANSWER_TIMEOUT_MS;
    session.questionPhase = 'answering';

    const player = session.players.get(playerId);
    const displayName = player?.displayName || buzzDisplayName || 'Player';

    const payload: BuzzPayload = {
      playerId,
      displayName,
      adjustedTimestamp,
    };

    await session.channel.publish('buzz_winner', payload);
    console.log(`🔔 [${roomId}] Buzz winner: ${displayName}`);

    setTimeout(async () => {
      const currentSession = roomSessions.get(roomId);
      if (currentSession &&
          currentSession.currentBuzzWinner === playerId &&
          !currentSession.answerReceived &&
          currentSession.questionPhase === 'answering') {
        await handleRoomAnswerTimeout(roomId);
      }
    }, ANSWER_TIMEOUT_MS + 500);
  }
}

interface AnswerData {
  playerId: string;
  answerIndex: number;
}

async function handleRoomAnswer(roomId: string, data: AnswerData): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session || session.questionPhase !== 'answering') return;

  const { playerId, answerIndex } = data;
  if (session.currentBuzzWinner !== playerId) return;
  if (session.answerReceived) return;

  session.answerReceived = true;

  const question = session.questions[session.currentQuestionIndex];
  const isCorrect = answerIndex === question.correctIndex;
  const points = isCorrect ? POINTS_CORRECT : POINTS_WRONG;

  session.lastAnswerCorrect = isCorrect;

  const currentScore = session.scores.get(playerId) || 0;
  session.scores.set(playerId, currentScore + points);

  if (isCorrect) {
    const correctCount = session.playerCorrectCount.get(playerId) || 0;
    session.playerCorrectCount.set(playerId, correctCount + 1);
    markQuestionAnsweredCorrectly(question.id).catch(err =>
      console.error(`Failed to mark question as answered:`, err)
    );
  } else {
    const wrongCount = session.playerWrongCount.get(playerId) || 0;
    session.playerWrongCount.set(playerId, wrongCount + 1);
  }

  const player = session.players.get(playerId);

  const answerPayload: AnswerPayload = {
    playerId,
    answerIndex,
    isCorrect,
    correctIndex: question.correctIndex,
    pointsAwarded: points,
  };

  await session.channel.publish('answer_result', answerPayload);
  console.log(`${isCorrect ? '✅' : '❌'} [${roomId}] ${player?.displayName || playerId} answered ${isCorrect ? 'correctly' : 'incorrectly'}`);

  const displayName = player?.displayName || 'Unknown';
  try {
    const stats = await updateUserStats(playerId, displayName, isCorrect, points);
    updateAllLeaderboards(playerId, displayName, points).catch(console.error);

    const newBadges = await checkAndAwardBadges(playerId, stats);
    if (newBadges.length > 0) {
      const existing = session.pendingBadges.get(playerId) || [];
      session.pendingBadges.set(playerId, [...existing, ...newBadges]);
      const setExisting = session.setEarnedBadges.get(playerId) || [];
      session.setEarnedBadges.set(playerId, [...setExisting, ...newBadges]);
    }
  } catch (error) {
    console.error(`Failed to persist stats for ${playerId}:`, error);
  }

  setTimeout(() => showRoomQuestionResults(roomId, isCorrect), 1500);
}

async function handleRoomAnswerTimeout(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  const playerId = session.currentBuzzWinner;
  if (!playerId) return;

  session.answerReceived = true;
  session.lastAnswerCorrect = false;

  const currentScore = session.scores.get(playerId) || 0;
  session.scores.set(playerId, currentScore + POINTS_WRONG);

  const wrongCount = session.playerWrongCount.get(playerId) || 0;
  session.playerWrongCount.set(playerId, wrongCount + 1);

  const question = session.questions[session.currentQuestionIndex];
  const player = session.players.get(playerId);

  const answerPayload: AnswerPayload = {
    playerId,
    answerIndex: -1,
    isCorrect: false,
    correctIndex: question.correctIndex,
    pointsAwarded: POINTS_WRONG,
  };

  await session.channel.publish('answer_result', answerPayload);
  console.log(`⏰ [${roomId}] ${player?.displayName || playerId} timed out`);

  const displayName = player?.displayName || 'Unknown';
  try {
    const stats = await updateUserStats(playerId, displayName, false, POINTS_WRONG);
    updateAllLeaderboards(playerId, displayName, POINTS_WRONG).catch(console.error);
    const newBadges = await checkAndAwardBadges(playerId, stats);
    if (newBadges.length > 0) {
      const existing = session.pendingBadges.get(playerId) || [];
      session.pendingBadges.set(playerId, [...existing, ...newBadges]);
      const setExisting = session.setEarnedBadges.get(playerId) || [];
      session.setEarnedBadges.set(playerId, [...setExisting, ...newBadges]);
    }
  } catch (error) {
    console.error(`Failed to persist timeout stats:`, error);
  }

  setTimeout(() => showRoomQuestionResults(roomId, false), 1500);
}

async function showRoomQuestionResults(roomId: string, wasCorrect: boolean): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  session.questionPhase = 'results';

  const question = session.questions[session.currentQuestionIndex];
  const scores: Record<string, number> = {};
  session.scores.forEach((score, id) => {
    scores[id] = score;
  });

  const winnerPlayer = session.currentBuzzWinner
    ? session.players.get(session.currentBuzzWinner)
    : null;

  const earnedBadges: Record<string, string[]> = {};
  session.pendingBadges.forEach((badges, playerId) => {
    if (badges.length > 0) {
      earnedBadges[playerId] = badges;
    }
  });

  const payload: QuestionEndPayload = {
    correctIndex: question.correctIndex,
    explanation: question.explanation || 'No explanation available.',
    scores,
    leaderboard: buildRoomLeaderboard(roomId),
    winnerId: session.currentBuzzWinner,
    winnerName: winnerPlayer?.displayName || null,
    wasAnswered: session.answerReceived,
    wasCorrect: session.lastAnswerCorrect,
    nextQuestionIn: RESULTS_DISPLAY_MS,
    questionText: question.text,
    options: question.options,
    category: question.category,
    detailedExplanation: question.detailedExplanation,
    citationUrl: question.citationUrl,
    citationTitle: question.citationTitle,
    earnedBadges: Object.keys(earnedBadges).length > 0 ? earnedBadges : undefined,
  };

  await session.channel.publish('question_end', payload);
  console.log(`📊 [${roomId}] Question ${session.currentQuestionIndex + 1}/${QUESTIONS_PER_SET} complete`);

  session.pendingBadges.clear();
  setTimeout(() => moveToNextRoomQuestion(roomId), RESULTS_DISPLAY_MS);
}

async function handleRoomNoBuzzes(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  session.answerReceived = false;
  session.lastAnswerCorrect = null;

  console.log(`⏰ [${roomId}] No buzzes received`);
  await showRoomQuestionResults(roomId, false);
}

async function moveToNextRoomQuestion(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  session.currentQuestionIndex++;
  session.currentBuzzWinner = null;
  session.answerDeadline = null;
  session.answerReceived = false;
  session.lastAnswerCorrect = null;
  session.buzzes.clear();
  session.questionPhase = 'waiting';
  session.questionStartTime = null;

  if (session.currentQuestionIndex >= session.questions.length) {
    await endRoomSet(roomId);
    return;
  }

  await startRoomQuestion(roomId);
}

async function startRoomSet(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room) return;

  const channel = roomChannels.get(roomId);
  if (!channel) return;

  const setId = `set-${roomId}-${Date.now()}`;

  // Get questions
  const questionsUsed = new Set<string>();
  let questions: Question[];
  try {
    questions = await getQuestionsForSet('general', QUESTIONS_PER_SET, questionsUsed);
    for (const q of questions) {
      questionsUsed.add(q.id);
    }
    console.log(`📚 [${roomId}] Got ${questions.length} questions`);
  } catch (error) {
    console.error(`❌ [${roomId}] Failed to get questions, using mock:`, error);
    questions = getMockQuestions(QUESTIONS_PER_SET);
  }

  if (questions.length === 0) {
    console.error(`❌ [${roomId}] No questions available`);
    return;
  }

  const session: RoomSession = {
    roomId,
    setId,
    questions,
    currentQuestionIndex: 0,
    players: new Map(),
    scores: new Map(),
    buzzes: new Map(),
    currentBuzzWinner: null,
    answerDeadline: null,
    questionStartTime: null,
    answerReceived: false,
    lastAnswerCorrect: null,
    questionPhase: 'waiting',
    pendingBadges: new Map(),
    setEarnedBadges: new Map(),
    playerCorrectCount: new Map(),
    playerWrongCount: new Map(),
    questionsUsed,
    channel,
    setCompleted: false,
  };

  roomSessions.set(roomId, session);

  // Get presence members
  try {
    const members = await channel.presence.get();
    for (const member of members) {
      if (member.clientId && !member.clientId.startsWith('game-')) {
        const player: Player = {
          id: member.clientId,
          displayName: member.data?.displayName || 'Anonymous',
          isAI: false,
          latency: 0,
          score: 0,
          correctCount: 0,
          wrongCount: 0,
          joinedAt: Date.now(),
        };
        session.players.set(player.id, player);
        session.scores.set(player.id, 0);
      }
    }
  } catch (e) {
    console.log(`Could not get presence for room ${roomId}:`, e);
  }

  setRoomStatus(roomId, 'in_progress', setId);

  console.log(`\n🎮 [${roomId}] Starting set: ${setId}`);
  console.log(`👥 [${roomId}] Players: ${session.players.size}`);

  await channel.publish('set_start', {
    setId,
    totalQuestions: QUESTIONS_PER_SET,
    playerCount: session.players.size,
    roomName: room.name,
  });

  await broadcastRoomList();
  await sleep(3000);
  await startRoomQuestion(roomId);
}

async function startRoomQuestion(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  if (session.currentQuestionIndex >= session.questions.length) {
    await endRoomSet(roomId);
    return;
  }

  const question = session.questions[session.currentQuestionIndex];
  session.questionStartTime = Date.now();
  session.currentBuzzWinner = null;
  session.answerReceived = false;
  session.lastAnswerCorrect = null;
  session.buzzes.clear();
  session.questionPhase = 'question';

  const payload: QuestionStartPayload = {
    question: {
      id: question.id,
      text: question.text,
      options: question.options,
      category: question.category,
      difficulty: question.difficulty,
    },
    questionIndex: session.currentQuestionIndex,
    totalQuestions: QUESTIONS_PER_SET,
    questionDuration: QUESTION_DISPLAY_MS,
  };

  await session.channel.publish('question_start', payload);
  console.log(`\n❓ [${roomId}] Q${session.currentQuestionIndex + 1}: ${question.text.substring(0, 50)}...`);

  setTimeout(async () => {
    const currentSession = roomSessions.get(roomId);
    if (currentSession &&
        currentSession.questionPhase === 'question' &&
        !currentSession.currentBuzzWinner) {
      await handleRoomNoBuzzes(roomId);
    }
  }, QUESTION_DISPLAY_MS);
}

async function endRoomSet(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  if (session.setCompleted) return;
  session.setCompleted = true;

  const finalScores: Record<string, number> = {};
  session.scores.forEach((score, id) => {
    finalScores[id] = score;
  });

  const leaderboard = buildRoomLeaderboard(roomId);

  const badgesSummary: Record<string, string[]> = {};
  session.setEarnedBadges.forEach((badges, playerId) => {
    if (badges.length > 0) {
      badgesSummary[playerId] = [...badges];
    }
  });

  const winner = leaderboard[0];
  const totalQuestions = session.questions.length;

  try {
    for (const [playerId, player] of session.players) {
      const isWinner = winner && winner.userId === playerId;
      const correctCount = session.playerCorrectCount.get(playerId) || 0;
      const wrongCount = session.playerWrongCount.get(playerId) || 0;
      const isPerfectSet = correctCount === totalQuestions && wrongCount === 0;

      const newBadges = await updateSetStats(playerId, isWinner, isPerfectSet);

      if (newBadges.length > 0) {
        const existing = badgesSummary[playerId] || [];
        badgesSummary[playerId] = [...existing, ...newBadges];
      }
    }
  } catch (error) {
    console.error(`Failed to persist set stats for room ${roomId}:`, error);
  }

  const payload: SetEndPayload = {
    finalScores,
    leaderboard,
    badgesSummary: Object.keys(badgesSummary).length > 0 ? badgesSummary : undefined,
  };

  await session.channel.publish('set_end', payload);

  console.log(`\n🏆 [${roomId}] Set complete!`);
  leaderboard.slice(0, 3).forEach((entry) => {
    console.log(`  ${entry.rank}. ${entry.displayName}: ${entry.score}`);
  });

  // Clean up
  roomSessions.delete(roomId);
  setRoomStatus(roomId, 'waiting');
  clearRoomReservations(roomId);

  await broadcastRoomList();
  console.log(`⏸️  [${roomId}] Waiting for next half hour...`);
}

// ============ Game Loop ============

async function runGameLoop(): Promise<void> {
  let lastHalfHour = -1;

  while (!isShuttingDown) {
    lastHeartbeat = Date.now();

    const now = new Date();
    const currentHour = now.getHours();
    const minutes = now.getMinutes();
    const currentHalfHour = currentHour * 2 + (minutes >= 30 ? 1 : 0);

    // New half-hour period
    if (currentHalfHour !== lastHalfHour) {
      lastHalfHour = currentHalfHour;
      questionCachePrewarmed = false;

      // Reset all room sessions for new period
      for (const [roomId, session] of roomSessions) {
        session.setCompleted = true;
      }
      roomSessions.clear();

      // Reset room statuses
      for (const roomId of getAllRoomIds()) {
        setRoomStatus(roomId, 'waiting');
      }

      const halfHourLabel = minutes >= 30 ? `${currentHour}:30` : `${currentHour}:00`;
      console.log(`\n🕐 New half-hour (${halfHourLabel}) - ready for new sets`);

      await broadcastRoomList();
    }

    const minutesInHalfHour = minutes % 30;
    const secondsInHalfHour = (minutes % 30) * 60 + now.getSeconds();
    const isSetStartWindow = secondsInHalfHour < 10;

    if (minutesInHalfHour < SET_DURATION_MINUTES) {
      // Active set period - start sets for rooms with players
      if (isSetStartWindow) {
        for (const roomId of getAllRoomIds()) {
          const room = getRoom(roomId);
          if (!room || room.status !== 'waiting') continue;
          if (roomSessions.has(roomId)) continue;

          // Check if room has players
          const channel = roomChannels.get(roomId);
          if (!channel) continue;

          try {
            const members = await channel.presence.get();
            const playerCount = members.filter(
              (m) => m.clientId && !m.clientId.startsWith('game-')
            ).length;

            if (playerCount > 0) {
              await startRoomSet(roomId);
            }
          } catch (e) {
            console.error(`Failed to check presence for room ${roomId}:`, e);
          }
        }
      }
    } else {
      // Break period - end any running sets
      for (const [roomId, session] of roomSessions) {
        if (!session.setCompleted) {
          console.log(`\n⏸️  Break time - ending set in room ${roomId}`);
          await endRoomSet(roomId);
        }
      }
    }

    // Check for room overflow - create new room if all are full
    const rooms = getRoomList();
    const availableRoom = rooms.find(r => r.status === 'waiting' && r.currentPlayers < MAX_PLAYERS_PER_ROOM);
    if (!availableRoom && lobbyPlayers.size > 0) {
      const newRoom = createRoom('medium');
      setupRoomChannel(newRoom.id);
      console.log(`🏠 Created new room (all full): ${newRoom.name}`);
      await broadcastRoomList();
    }

    // Smart broadcast frequency based on time until join window opens
    // Only broadcast when players are in lobby to save Ably messages
    if (lobbyPlayers.size > 0) {
      const joinWindow = isJoinWindowOpen();
      const secondsUntil = joinWindow.secondsUntilOpen || 0;
      const currentSecond = now.getSeconds();

      let shouldBroadcast = false;
      if (joinWindow.canJoin) {
        // Join window open - broadcast every 10 seconds
        shouldBroadcast = currentSecond % 10 === 0;
      } else if (secondsUntil <= 10) {
        // Last 10 seconds - broadcast every second
        shouldBroadcast = true;
      } else if (secondsUntil <= 60) {
        // Last minute - broadcast every 10 seconds
        shouldBroadcast = currentSecond % 10 === 0;
      } else {
        // More than a minute away - broadcast every minute
        shouldBroadcast = currentSecond === 0;
      }

      if (shouldBroadcast) {
        await broadcastRoomList();
      }
    }

    await sleep(1000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============ Main Entry Point ============

async function main(): Promise<void> {
  console.log('🎯 Quiz Game Orchestrator Starting (Multi-Room)...');
  console.log(`📋 Config: ${QUESTIONS_PER_SET} questions per set, ${SET_DURATION_MINUTES} min sets`);
  console.log(`🏠 Max ${MAX_PLAYERS_PER_ROOM} players per room`);

  healthApp.listen(HEALTH_PORT, () => {
    console.log(`🏥 Health check server running on port ${HEALTH_PORT}`);
  });

  initAbly();

  await new Promise<void>((resolve) => {
    if (ably?.connection.state === 'connected') {
      resolve();
    } else {
      ably?.connection.once('connected', () => resolve());
    }
  });

  console.log('🚀 Starting game loop...\n');
  await runGameLoop();
}

main().catch(console.error);

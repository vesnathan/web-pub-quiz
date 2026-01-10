import Ably from "ably";
import express from "express";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  UpdateCommand,
  QueryCommand,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  ABLY_CHANNELS,
  DEFAULT_GAME_CONFIG,
  calculateQuestionDisplayTime,
  FREE_TIER_DAILY_QUESTION_LIMIT,
} from "@quiz/shared";
import {
  loadGameConfig,
  getConfig,
  refreshConfig,
  saveGameConfig,
} from "./configLoader";
import type {
  OrchestratorQuestion as Question,
  Player,
  QuestionStartPayload,
  AnswerPayload,
  QuestionEndPayload,
  SetEndPayload,
  LeaderboardEntry,
  RoomListItem,
} from "@quiz/shared";
import { getMockQuestions } from "./mockQuestions";
import {
  getEarnedBadges,
  getBadgeById,
  type UserStats as BadgeUserStats,
  type BadgeCheckContext,
  type BadgeDefinition,
} from "./badges";
import {
  getQuestionsForMixedSet,
  markQuestionAsked,
  markQuestionAnsweredCorrectly,
  markQuestionAnsweredIncorrectly,
} from "./questionGenerator";
import {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  getRoomList,
  setRoomStatus,
  getAllRoomIds,
  findAvailableRoom,
  getRoomStats,
  checkAndAddRoomIfNeeded,
  createRoomsForNewHalfHour,
  resetRoom,
  resetWaitingRooms,
} from "./roomManager";
import type { QuestionCategory, Room } from "@quiz/shared";

// ============ Data Interfaces for Ably Messages ============

interface AnswerData {
  playerId: string;
  answerIndex: number;
}

// Track guesses per player per question (for multi-guess support)
interface PlayerQuestionState {
  guessCount: number;
  wrongAnswers: number[]; // indices of wrong guesses
  totalPenalty: number;
  answeredCorrectly: boolean; // whether player got the correct answer (even if not first)
}

// Wrong answer event sent to individual player
interface WrongAnswerPayload {
  answerIndex: number;
  penalty: number;
  guessCount: number;
  wrongAnswers: number[];
}

// ============ Health Check Server ============
const HEALTH_PORT = 8080;
let isHealthy = true;
let isShuttingDown = false;
let lastHeartbeat = Date.now();

const healthApp = express();

// Enable CORS for frontend polling
healthApp.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

healthApp.get("/health", (_req, res) => {
  const ablyConnected = ably?.connection.state === "connected";
  const heartbeatRecent = Date.now() - lastHeartbeat < 60000;

  if (isHealthy && ablyConnected && heartbeatRecent && !isShuttingDown) {
    res.status(200).json({
      status: "healthy",
      ablyConnected,
      lastHeartbeat: new Date(lastHeartbeat).toISOString(),
      uptime: process.uptime(),
      rooms: getRoomStats(),
    });
  } else {
    res.status(503).json({
      status: "unhealthy",
      ablyConnected,
      lastHeartbeat: new Date(lastHeartbeat).toISOString(),
      isShuttingDown,
    });
  }
});

// Note: Room list is now written to DynamoDB and queried via AppSync
// Queue operations use Ably, not HTTP

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
      await lobbyChannel.publish("orchestrator_shutdown", {
        message: "Server restarting, please wait...",
      });
    } catch (e) {
      console.error("Failed to publish shutdown message:", e);
    }
  }

  if (ably) {
    console.log("🔌 Closing Ably connection...");
    ably.close();
  }

  console.log("✅ Graceful shutdown complete");
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// ============ Global Error Handlers ============
process.on("unhandledRejection", (reason, promise) => {
  console.error("⚠️ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  isHealthy = false;
  setTimeout(() => {
    console.error("Exiting due to uncaught exception...");
    process.exit(1);
  }, 10000);
});

// DynamoDB setup
const ddbClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-2",
});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE_NAME = process.env.TABLE_NAME || "quiz-night-live-datatable-prod";

// Timing constants - now loaded from config
// RESULTS_DISPLAY_MS moved to getConfig().resultsDisplayMs

// ============ Guest Detection ============

/**
 * Check if a player ID belongs to a guest (non-authenticated user).
 * Guests don't have stats saved, don't appear on leaderboards, and don't earn badges.
 */
function isGuestPlayer(playerId: string): boolean {
  return playerId.startsWith("guest-");
}

// ============ Guest Quota Tracking ============

// Store guest tracking info (fingerprint, IP) keyed by guestId
interface GuestTrackingInfo {
  fingerprint?: string;
  clientIp?: string;
}
const guestTrackingInfo = new Map<string, GuestTrackingInfo>();

/**
 * Store tracking info for a guest when they join
 */
function setGuestTrackingInfo(
  guestId: string,
  fingerprint?: string,
  clientIp?: string,
): void {
  guestTrackingInfo.set(guestId, { fingerprint, clientIp });
}

/**
 * Get today's date in YYYY-MM-DD format (UTC)
 */
function getTodayDateKey(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Check quota for a single identifier (guestId, fingerprint, or IP)
 */
async function checkQuotaByIdentifier(
  identifierType: string,
  identifier: string,
): Promise<number> {
  const dateKey = getTodayDateKey();
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `GUEST_QUOTA#${identifierType}:${identifier}`, SK: dateKey },
      }),
    );
    return result.Item?.questionsAnswered || 0;
  } catch (error) {
    console.error(
      `Failed to check quota for ${identifierType}:${identifier}:`,
      error,
    );
    return 0;
  }
}

/**
 * Check if a guest has exceeded their daily question quota.
 * Checks guestId, fingerprint, and IP - if ANY exceeds limit, returns -1.
 */
async function checkGuestQuota(guestId: string): Promise<number> {
  const trackingInfo = guestTrackingInfo.get(guestId);

  // Check all identifiers in parallel
  const checks: Promise<{ type: string; count: number }>[] = [
    checkQuotaByIdentifier("guestId", guestId).then((count) => ({
      type: "guestId",
      count,
    })),
  ];

  if (trackingInfo?.fingerprint) {
    checks.push(
      checkQuotaByIdentifier("fingerprint", trackingInfo.fingerprint).then(
        (count) => ({ type: "fingerprint", count }),
      ),
    );
  }

  if (trackingInfo?.clientIp) {
    checks.push(
      checkQuotaByIdentifier("ip", trackingInfo.clientIp).then((count) => ({
        type: "ip",
        count,
      })),
    );
  }

  const results = await Promise.all(checks);

  // Log all counts for debugging
  for (const { type, count } of results) {
    console.log(
      `📊 Guest quota check - ${type}: ${count}/${FREE_TIER_DAILY_QUESTION_LIMIT}`,
    );
  }

  // If any identifier exceeds limit, block
  const exceeded = results.find(
    ({ count }) => count >= FREE_TIER_DAILY_QUESTION_LIMIT,
  );
  if (exceeded) {
    console.log(
      `🚫 Guest ${guestId} exceeded quota via ${exceeded.type} (${exceeded.count})`,
    );
    return -1;
  }

  // Return the max count across all identifiers
  return Math.max(...results.map(({ count }) => count));
}

/**
 * Increment quota for a single identifier
 */
async function incrementQuotaByIdentifier(
  identifierType: string,
  identifier: string,
): Promise<void> {
  const dateKey = getTodayDateKey();
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `GUEST_QUOTA#${identifierType}:${identifier}`, SK: dateKey },
        UpdateExpression:
          "SET questionsAnswered = if_not_exists(questionsAnswered, :zero) + :one, #ttl = :ttl",
        ExpressionAttributeNames: { "#ttl": "TTL" },
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          // TTL: expire after 2 days (gives buffer for timezone differences)
          ":ttl": Math.floor(Date.now() / 1000) + 2 * 24 * 60 * 60,
        },
      }),
    );
  } catch (error) {
    console.error(
      `Failed to increment quota for ${identifierType}:${identifier}:`,
      error,
    );
  }
}

/**
 * Increment the guest's question count for today across all identifiers.
 */
async function incrementGuestQuota(guestId: string): Promise<void> {
  const trackingInfo = guestTrackingInfo.get(guestId);

  // Increment all identifiers in parallel
  const updates: Promise<void>[] = [
    incrementQuotaByIdentifier("guestId", guestId),
  ];

  if (trackingInfo?.fingerprint) {
    updates.push(
      incrementQuotaByIdentifier("fingerprint", trackingInfo.fingerprint),
    );
  }

  if (trackingInfo?.clientIp) {
    updates.push(incrementQuotaByIdentifier("ip", trackingInfo.clientIp));
  }

  await Promise.all(updates);
}

// ============ DynamoDB Helper Functions ============

async function updateUserStats(
  userId: string,
  displayName: string,
  isCorrect: boolean,
  points: number,
): Promise<BadgeUserStats> {
  try {
    const result = await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: "PROFILE" },
        UpdateExpression: `
          SET stats.totalCorrect = if_not_exists(stats.totalCorrect, :zero) + :correct,
              stats.totalWrong = if_not_exists(stats.totalWrong, :zero) + :wrong,
              stats.totalPoints = if_not_exists(stats.totalPoints, :zero) + :points,
              stats.currentStreak = if_not_exists(stats.currentStreak, :zero) + :streakDelta,
              stats.longestStreak = if_not_exists(stats.longestStreak, :zero),
              displayName = if_not_exists(displayName, :displayName)
        `,
        ExpressionAttributeValues: {
          ":zero": 0,
          ":correct": isCorrect ? 1 : 0,
          ":wrong": isCorrect ? 0 : 1,
          ":points": points,
          ":streakDelta": isCorrect ? 1 : 0,
          ":displayName": displayName,
        },
        ReturnValues: "ALL_NEW",
      }),
    );

    const stats = result.Attributes?.stats || {};
    let currentStreak = stats.currentStreak || 0;
    let longestStreak = stats.longestStreak || 0;

    if (!isCorrect && currentStreak > 0) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: "PROFILE" },
          UpdateExpression: "SET stats.currentStreak = :zero",
          ExpressionAttributeValues: { ":zero": 0 },
        }),
      );
      currentStreak = 0;
    }

    if (isCorrect && currentStreak > longestStreak) {
      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: `USER#${userId}`, SK: "PROFILE" },
          UpdateExpression: "SET stats.longestStreak = :streak",
          ExpressionAttributeValues: { ":streak": currentStreak },
        }),
      );
      longestStreak = currentStreak;
    }

    return {
      totalCorrect: stats.totalCorrect || 0,
      totalWrong: stats.totalWrong || 0,
      totalPoints: stats.totalPoints || 0,
      currentStreak,
      longestStreak,
    };
  } catch (error) {
    console.error(`Failed to update stats for ${userId}:`, error);
    return {
      totalCorrect: 0,
      totalWrong: 0,
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
    };
  }
}

/**
 * Calculate ISO 8601 week number.
 * Week 1 is the week containing the first Thursday of the year.
 */
function getISOWeek(date: Date): { year: number; week: number } {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  // Set to nearest Thursday: current date + 4 - current day number (Monday = 1, Sunday = 7)
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks between yearStart and d
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: d.getUTCFullYear(), week: weekNo };
}

async function updateLeaderboardEntry(
  leaderboardType: "daily" | "weekly" | "alltime",
  userId: string,
  displayName: string,
  pointsDelta: number,
): Promise<void> {
  try {
    const now = new Date();
    let pk: string;

    if (leaderboardType === "daily") {
      const dateStr = now.toISOString().split("T")[0];
      pk = `LEADERBOARD#daily#${dateStr}`;
    } else if (leaderboardType === "weekly") {
      // Use ISO 8601 week format to match AppSync resolver
      const { year, week } = getISOWeek(now);
      pk = `LEADERBOARD#weekly#${year}-W${String(week).padStart(2, "0")}`;
    } else {
      pk = "LEADERBOARD#alltime";
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
          ":zero": 0,
          ":points": pointsDelta,
          ":displayName": displayName,
          ":userId": userId,
          ":now": now.toISOString(),
        },
      }),
    );
  } catch (error) {
    console.error(
      `Failed to update ${leaderboardType} leaderboard for ${userId}:`,
      error,
    );
  }
}

async function updateAllLeaderboards(
  userId: string,
  displayName: string,
  points: number,
): Promise<void> {
  await Promise.all([
    updateLeaderboardEntry("daily", userId, displayName, points),
    updateLeaderboardEntry("weekly", userId, displayName, points),
    updateLeaderboardEntry("alltime", userId, displayName, points),
  ]);
}

async function awardBadge(
  userId: string,
  badge: BadgeDefinition,
): Promise<boolean> {
  try {
    // Check if badge already exists (non-repeatable badges)
    const user = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: "PROFILE" },
        ProjectionExpression: "badges",
      }),
    );

    const existingBadges = user.Item?.badges || [];
    if (existingBadges.some((b: { id: string }) => b.id === badge.id)) {
      return false;
    }

    // Store badge with all metadata from awards system
    const earnedBadge = {
      id: badge.id,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      groupId: badge.groupId,
      tier: badge.tier,
      rarity: badge.rarity,
      skillPoints: badge.skillPoints,
      earnedAt: new Date().toISOString(),
    };

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: "PROFILE" },
        UpdateExpression:
          "SET badges = list_append(if_not_exists(badges, :empty), :badge)",
        ExpressionAttributeValues: {
          ":badge": [earnedBadge],
          ":empty": [],
        },
      }),
    );

    console.log(
      `🏅 Awarded badge "${badge.name}" (${badge.rarity}) to user ${userId}`,
    );
    return true;
  } catch (error) {
    console.error(`Failed to award badge ${badge.id} to ${userId}:`, error);
    return false;
  }
}

async function checkAndAwardBadges(
  userId: string,
  stats: BadgeUserStats,
  context?: BadgeCheckContext,
): Promise<string[]> {
  const earnedBadges = getEarnedBadges(stats, context);
  const newlyEarnedBadgeIds: string[] = [];

  for (const badge of earnedBadges) {
    const wasNew = await awardBadge(userId, badge);
    if (wasNew) {
      newlyEarnedBadgeIds.push(badge.id);
    }
  }

  return newlyEarnedBadgeIds;
}

// ============ Room Session State ============

interface RoomSession {
  roomId: string;
  setId: string;
  questions: Question[];
  currentQuestionIndex: number;
  players: Map<string, Player>;
  scores: Map<string, number>;
  questionStartTime: number | null;
  questionPhase: "waiting" | "question" | "results";
  pendingBadges: Map<string, string[]>;
  setEarnedBadges: Map<string, string[]>;
  playerCorrectCount: Map<string, number>;
  playerWrongCount: Map<string, number>;
  questionsUsed: Set<string>;
  channel: Ably.RealtimeChannel;
  setCompleted: boolean;
  // Dynamic timing for current question
  currentQuestionDisplayMs: number;
  // Consecutive question tracking (Q1, Q2, Q3... in a row)
  playerLastQuestionAnswered: Map<string, number>; // last question index answered correctly
  playerConsecutiveRun: Map<string, number>; // current consecutive run count
  // Multi-guess tracking per player per question
  playerQuestionState: Map<string, PlayerQuestionState>;
  questionWinner: string | null; // First player to answer correctly
  questionWinnerName: string | null;
  questionWinnerPoints: number | null; // Points awarded to the winner
  // Timer management - store timeout IDs to prevent accumulation
  questionTimeoutId: NodeJS.Timeout | null;
  resultsTimeoutId: NodeJS.Timeout | null;
}

// Multi-room state
const roomSessions: Map<string, RoomSession> = new Map();
const roomChannels: Map<string, Ably.RealtimeChannel> = new Map();

let ably: Ably.Realtime | null = null;
let lobbyChannel: Ably.RealtimeChannel | null = null;

// Maintenance mode state (persisted in memory, broadcast to all clients)
let maintenanceMode = false;
let maintenanceMessage: string | null = null;

// Track players in lobby (waiting to join a room)
const lobbyPlayers: Map<string, { displayName: string; joinedAt: number }> =
  new Map();

// Track displayName -> clientId mapping to detect duplicate connections
const displayNameToClientId: Map<string, string> = new Map();

// Track players queued to join each room (legacy, kept for queue handling)
// roomId -> Set of playerIds
const roomQueues: Map<string, Set<string>> = new Map();

// Track last DynamoDB room list write time
let lastRoomListWriteTime = 0;
const ROOM_LIST_WRITE_INTERVAL_MS = 10000; // Write every 10 seconds

/**
 * Write room list state to DynamoDB for frontend polling via AppSync
 * Updates a single item: PK=ROOMS#lobby, SK=STATE
 */
async function writeRoomListToDynamoDB(): Promise<void> {
  const now = Date.now();
  if (now - lastRoomListWriteTime < ROOM_LIST_WRITE_INTERVAL_MS) {
    return; // Throttle writes
  }
  lastRoomListWriteTime = now;

  try {
    const baseRooms = getRoomList();

    // Add currentQuestion from session data
    const rooms = baseRooms.map((room) => {
      const session = roomSessions.get(room.id);
      return {
        ...room,
        inProgress:
          session?.questions &&
          session.questions.length > 0 &&
          session.currentQuestionIndex < session.questions.length,
        currentQuestion: session?.currentQuestionIndex ?? null,
      };
    });

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: "ROOMS#lobby",
          SK: "STATE",
          rooms,
          lobbyPlayerCount: lobbyPlayers.size,
          maintenanceMode,
          maintenanceMessage,
          updatedAt: new Date().toISOString(),
          ttl: Math.floor(now / 1000) + 300, // Expire in 5 minutes if not updated
        },
      }),
    );
  } catch (error) {
    console.error("Failed to write room list to DynamoDB:", error);
  }
}

/**
 * Rooms are always open for joining.
 * Games start automatically when the first player joins.
 */
function isJoinWindowOpen(): {
  canJoin: boolean;
  reason?: string;
  secondsUntilOpen?: number;
} {
  // Always allow joining - rooms are always open
  return { canJoin: true };
}

// ============ Ably Initialization ============

function initAbly(): void {
  const ablyKey = process.env.ABLY_API_KEY || process.env.NEXT_PUBLIC_ABLY_KEY;

  if (!ablyKey) {
    console.error("ABLY_API_KEY not set");
    process.exit(1);
  }

  ably = new Ably.Realtime({
    key: ablyKey,
    clientId: "game-orchestrator",
  });

  ably.connection.on("connected", () => {
    console.log("✅ Connected to Ably");
  });

  ably.connection.on("failed", (err) => {
    console.error("❌ Ably connection failed:", err);
  });

  // Setup lobby channel
  lobbyChannel = ably.channels.get(ABLY_CHANNELS.LOBBY);
  setupLobbyPresence();

  // Create initial rooms (easy, medium, hard)
  createRoomsForNewHalfHour();
  // Setup channels for all rooms
  for (const roomId of getAllRoomIds()) {
    setupRoomChannel(roomId);
  }
  console.log(`🏠 Created ${getAllRoomIds().length} initial rooms`);
}

function setupLobbyPresence(): void {
  if (!lobbyChannel) return;

  const presence = lobbyChannel.presence;

  presence.subscribe("enter", async (member) => {
    const playerId = member.clientId!;
    const displayName = member.data?.displayName || "Anonymous";

    // Check for duplicate connection with same displayName
    const existingClientId = displayNameToClientId.get(displayName);
    if (existingClientId && existingClientId !== playerId) {
      // Tell the old connection to disconnect
      console.log(
        `🔄 Duplicate connection for ${displayName}: kicking old client ${existingClientId}`,
      );
      await lobbyChannel!.publish("duplicate_connection", {
        clientId: existingClientId,
        displayName,
        message: "You connected from another device/tab",
      });
      // Clean up old connection from tracking
      lobbyPlayers.delete(existingClientId);
    }

    // Track new connection
    displayNameToClientId.set(displayName, playerId);
    lobbyPlayers.set(playerId, {
      displayName,
      joinedAt: Date.now(),
    });

    console.log(
      `👤 Player entered lobby: ${displayName} (${lobbyPlayers.size} in lobby)`,
    );
    // Room list updates are now polled via HTTP, not broadcast
  });

  presence.subscribe("leave", async (member) => {
    const playerId = member.clientId!;
    const player = lobbyPlayers.get(playerId);
    lobbyPlayers.delete(playerId);

    // Only clear displayName mapping if this was the current client for that name
    if (player && displayNameToClientId.get(player.displayName) === playerId) {
      displayNameToClientId.delete(player.displayName);
    }

    console.log(
      `👋 Player left lobby: ${player?.displayName || playerId} (${lobbyPlayers.size} in lobby)`,
    );
    // Room list updates are now polled via HTTP, not broadcast
  });

  // Note: request_room_list no longer needed - frontend polls /api/rooms

  // Handle maintenance mode toggle from admin
  lobbyChannel.subscribe("maintenance_mode", async (message) => {
    const { enabled, customMessage } = message.data;
    maintenanceMode = enabled;
    maintenanceMessage = customMessage || null;
    console.log(
      `🔧 Maintenance mode ${enabled ? "ENABLED" : "DISABLED"}${customMessage ? `: ${customMessage}` : ""}`,
    );

    // Save to DynamoDB config
    try {
      const currentConfig = getConfig();
      await saveGameConfig({
        ...currentConfig,
        maintenanceMode: enabled,
        maintenanceMessage: customMessage || null,
      });
    } catch (e) {
      console.error("Failed to save maintenance mode to config:", e);
    }

    // Broadcast maintenance mode change via Ably (time-critical for immediate effect)
    await lobbyChannel!.publish("maintenance_update", {
      enabled,
      customMessage,
    });
  });

  // Handle room join requests
  lobbyChannel.subscribe("join_room", async (message) => {
    const { playerId, roomId, displayName, fingerprint, clientIp } =
      message.data;
    console.log(
      `📥 JOIN_ROOM request: playerId=${playerId}, roomId=${roomId}, displayName=${displayName}, fp=${fingerprint?.substring(0, 8)}..., ip=${clientIp}`,
    );

    // Store tracking info for guest quota enforcement
    if (isGuestPlayer(playerId)) {
      setGuestTrackingInfo(playerId, fingerprint, clientIp);
    }

    // Check if join window is open
    const joinWindow = isJoinWindowOpen();
    console.log(
      `📥 JOIN_ROOM window check: canJoin=${joinWindow.canJoin}, reason=${joinWindow.reason}, secondsUntilOpen=${joinWindow.secondsUntilOpen}`,
    );
    if (!joinWindow.canJoin) {
      console.log(`❌ JOIN_ROOM REJECTED: window closed for ${displayName}`);
      await lobbyChannel!.publish("join_room_result", {
        playerId,
        success: false,
        error: joinWindow.reason,
        secondsUntilOpen: joinWindow.secondsUntilOpen,
      });
      return;
    }

    const room = getRoom(roomId);
    if (!room) {
      await lobbyChannel!.publish("join_room_result", {
        playerId,
        success: false,
        error: "Room not found",
      });
      return;
    }

    const success = joinRoom(roomId, playerId);
    if (success) {
      console.log(`✅ ${displayName} joined room ${room.name}`);

      // Remove player from queue if they were queued
      const queue = roomQueues.get(roomId);
      if (queue) {
        queue.delete(playerId);
        if (queue.size === 0) {
          roomQueues.delete(roomId);
        }
      }

      // Check if we need to add more rooms based on player count
      const newRoom = checkAndAddRoomIfNeeded();
      if (newRoom) {
        setupRoomChannel(newRoom.id);
      }
      // Room list updates are now polled via HTTP
    }

    await lobbyChannel!.publish("join_room_result", {
      playerId,
      success,
      roomId: success ? roomId : undefined,
      roomName: success ? room.name : undefined,
      error: success ? undefined : "Room is full",
    });
  });

  // Handle auto-join (find any available room)
  lobbyChannel.subscribe("auto_join", async (message) => {
    const { playerId, displayName, fingerprint, clientIp } = message.data;

    // Store tracking info for guest quota enforcement
    if (isGuestPlayer(playerId)) {
      setGuestTrackingInfo(playerId, fingerprint, clientIp);
    }

    // Check if join window is open
    const joinWindow = isJoinWindowOpen();
    if (!joinWindow.canJoin) {
      await lobbyChannel!.publish("join_room_result", {
        playerId,
        success: false,
        error: joinWindow.reason,
        secondsUntilOpen: joinWindow.secondsUntilOpen,
      });
      return;
    }

    let room = findAvailableRoom();

    // If all rooms are full or in progress, create a new one
    if (!room || room.currentPlayers >= getConfig().maxPlayersPerRoom) {
      room = createRoom("medium");
      setupRoomChannel(room.id);
      console.log(`🏠 Created new room (overflow): ${room.name}`);
    }

    const success = joinRoom(room.id, playerId);

    await lobbyChannel!.publish("join_room_result", {
      playerId,
      success,
      roomId: success ? room.id : undefined,
      roomName: success ? room.name : undefined,
      error: success ? undefined : "Failed to join room",
    });

    if (success) {
      console.log(`✅ ${displayName} auto-joined room ${room.name}`);

      // Remove player from queue if they were queued
      const queue = roomQueues.get(room.id);
      if (queue) {
        queue.delete(playerId);
        if (queue.size === 0) {
          roomQueues.delete(room.id);
        }
      }

      // Check if we need to add more rooms based on player count
      const newRoom = checkAndAddRoomIfNeeded();
      if (newRoom) {
        setupRoomChannel(newRoom.id);
      }
      // Room list updates are now polled via HTTP
    }
  });

  // Handle queue_join - player wants to join a room when window opens
  lobbyChannel.subscribe("queue_join", async (message) => {
    const { playerId, roomId, displayName } = message.data;
    console.log(`⏳ QUEUE_JOIN: playerId=${playerId}, roomId=${roomId}`);

    // Add to room's queue
    if (!roomQueues.has(roomId)) {
      roomQueues.set(roomId, new Set());
    }
    roomQueues.get(roomId)!.add(playerId);

    // Track display name for when they auto-join
    if (displayName) {
      lobbyPlayers.set(playerId, { displayName, joinedAt: Date.now() });
    }

    await lobbyChannel!.publish("queue_join_result", {
      playerId,
      roomId,
      success: true,
      queuePosition: roomQueues.get(roomId)!.size,
    });
  });

  // Handle queue_leave - player no longer wants to auto-join
  lobbyChannel.subscribe("queue_leave", async (message) => {
    const { playerId, roomId } = message.data;
    console.log(`⏳ QUEUE_LEAVE: playerId=${playerId}, roomId=${roomId}`);

    const queue = roomQueues.get(roomId);
    if (queue) {
      queue.delete(playerId);
      if (queue.size === 0) {
        roomQueues.delete(roomId);
      }
    }

    await lobbyChannel!.publish("queue_leave_result", {
      playerId,
      roomId,
      success: true,
    });
  });
}

function setupRoomChannel(roomId: string): void {
  if (!ably) return;

  const channelName = `${ABLY_CHANNELS.ROOM_PREFIX}${roomId}`;
  const channel = ably.channels.get(channelName);
  roomChannels.set(roomId, channel);

  const presence = channel.presence;

  // Track players entering the room channel
  // If no active session, start a new game when first player joins
  presence.subscribe("enter", async (member) => {
    const playerId = member.clientId!;

    // Skip orchestrator's own presence
    if (playerId.startsWith("game-")) return;

    const displayName = member.data?.displayName || "Anonymous";
    const session = roomSessions.get(roomId);

    if (session) {
      // Active session - add player to it
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
      console.log(
        `👤 ${displayName} joined active game in room ${roomId} (${session.players.size} players)`,
      );
    } else {
      // No active session - start a new game!
      console.log(
        `🎮 First player (${displayName}) joined room ${roomId} - starting game!`,
      );
      await startRoomSet(roomId);
    }
  });

  presence.subscribe("leave", async (member) => {
    const playerId = member.clientId!;
    const session = roomSessions.get(roomId);

    if (session) {
      const player = session.players.get(playerId);
      session.players.delete(playerId);

      // Leave room in DynamoDB
      leaveRoom(roomId, playerId, false);

      console.log(`👋 ${player?.displayName || playerId} left room ${roomId}`);

      // Check if room is now empty - wind down if so
      const channel = roomChannels.get(roomId);
      if (channel) {
        try {
          const members = await channel.presence.get();
          const playerCount = members.filter(
            (m) => m.clientId && !m.clientId.startsWith("game-"),
          ).length;

          if (playerCount === 0) {
            console.log(
              `⏹️  [${roomId}] No players remaining - winding down room`,
            );
            roomSessions.delete(roomId);
            resetRoom(roomId);
          }
        } catch (e) {
          console.error(`Error checking presence on leave:`, e);
        }
      }
    }
  });

  // Handle answers for this room (multi-guess: players can answer directly)
  channel.subscribe("answer", async (message) => {
    await handleRoomAnswer(roomId, message.data);
  });

  console.log(`📡 Setup channel for room ${roomId}`);
}

// Note: broadcastRoomList removed - frontend now polls /api/rooms HTTP endpoint
// This saves significant Ably message costs for non-time-critical updates

// ============ Room Game Logic ============

function buildRoomLeaderboard(roomId: string): LeaderboardEntry[] {
  const session = roomSessions.get(roomId);
  if (!session) return [];

  return Array.from(session.scores.entries())
    .map(([id, score]) => {
      const player = session.players.get(id);
      const displayName = player?.displayName || "Unknown";
      return {
        rank: 0,
        userId: id,
        username: displayName,
        displayName,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

/**
 * Clear all pending timers for a room session
 * Prevents timer accumulation when questions end early or room transitions
 */
function clearRoomTimers(session: RoomSession): void {
  if (session.questionTimeoutId) {
    clearTimeout(session.questionTimeoutId);
    session.questionTimeoutId = null;
  }
  if (session.resultsTimeoutId) {
    clearTimeout(session.resultsTimeoutId);
    session.resultsTimeoutId = null;
  }
}

/**
 * Calculate penalty multiplier based on guess count
 * 1st wrong: 1x, 2nd wrong: 1.5x, 3rd+: 2x
 */
function getPenaltyMultiplier(guessCount: number): number {
  if (guessCount === 1) return 1;
  if (guessCount === 2) return 1.5;
  return 2; // 3rd guess and beyond
}

/**
 * Get or create player question state for multi-guess tracking
 */
function getOrCreatePlayerQuestionState(
  session: RoomSession,
  playerId: string,
): PlayerQuestionState {
  let state = session.playerQuestionState.get(playerId);
  if (!state) {
    state = {
      guessCount: 0,
      wrongAnswers: [],
      totalPenalty: 0,
      answeredCorrectly: false,
    };
    session.playerQuestionState.set(playerId, state);
  }
  return state;
}

/**
 * Handle player answer in multi-guess mode
 * - Players can answer during 'question' phase (no buzzer required)
 * - First correct answer wins and ends the question immediately
 * - Wrong guesses incur escalating penalties
 */
async function handleRoomAnswer(
  roomId: string,
  data: AnswerData,
): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session || session.questionPhase !== "question") return;

  const { playerId, answerIndex } = data;

  const playerState = getOrCreatePlayerQuestionState(session, playerId);
  const question = session.questions[session.currentQuestionIndex];
  const isCorrect = answerIndex === question.correctIndex;

  // Skip if player already answered correctly or guessed this answer
  if (playerState.answeredCorrectly) return;
  if (playerState.wrongAnswers.includes(answerIndex)) return;

  // Check guest quota on first attempt at this question
  const isFirstAttempt =
    playerState.guessCount === 0 && !playerState.answeredCorrectly;
  if (isGuestPlayer(playerId) && isFirstAttempt) {
    const quotaCount = await checkGuestQuota(playerId);
    if (quotaCount === -1) {
      // Quota exceeded - notify player and reject answer
      console.log(`🚫 [${roomId}] Guest ${playerId} exceeded daily quota`);
      const userChannel = ably?.channels.get(
        `${ABLY_CHANNELS.USER_PREFIX}${playerId}`,
      );
      if (userChannel) {
        await userChannel.publish("quota_exceeded", {
          limit: FREE_TIER_DAILY_QUESTION_LIMIT,
          message: `You've reached your daily limit of ${FREE_TIER_DAILY_QUESTION_LIMIT} free questions. Sign up to continue playing!`,
        });
      }
      return;
    }
    // Increment quota for this question attempt
    await incrementGuestQuota(playerId);
  }

  const player = session.players.get(playerId);
  const displayName = player?.displayName || "Unknown";
  const config = getConfig();
  const difficulty = (question.difficulty || "medium") as
    | "easy"
    | "medium"
    | "hard";
  const difficultyPoints =
    config.difficultyPoints[difficulty] || config.difficultyPoints.medium;

  if (isCorrect) {
    // Mark player as having answered correctly
    playerState.answeredCorrectly = true;

    // Check if this is the FIRST correct answer (winner)
    const isWinner = !session.questionWinner;

    if (isWinner) {
      // WINNER - First correct answer
      session.questionWinner = playerId;
      session.questionWinnerName = displayName;

      const points = difficultyPoints.correct;
      session.questionWinnerPoints = points;
      const currentScore = session.scores.get(playerId) || 0;
      session.scores.set(playerId, currentScore + points);

      const correctCount = session.playerCorrectCount.get(playerId) || 0;
      session.playerCorrectCount.set(playerId, correctCount + 1);

      markQuestionAnsweredCorrectly(question.id).catch((err) =>
        console.error(`Failed to mark question as correct:`, err),
      );

      // Track consecutive question runs (answering Q1, Q2, Q3... in sequence)
      const lastAnswered = session.playerLastQuestionAnswered.get(playerId);
      const currentIndex = session.currentQuestionIndex;
      if (lastAnswered !== undefined && lastAnswered === currentIndex - 1) {
        const currentRun = session.playerConsecutiveRun.get(playerId) || 1;
        session.playerConsecutiveRun.set(playerId, currentRun + 1);
      } else {
        session.playerConsecutiveRun.set(playerId, 1);
      }
      session.playerLastQuestionAnswered.set(playerId, currentIndex);

      // Publish winner to all players
      const answerPayload: AnswerPayload = {
        playerId,
        answerIndex,
        isCorrect: true,
        correctIndex: question.correctIndex,
        pointsAwarded: points,
      };
      await session.channel.publish("answer_result", answerPayload);

      console.log(
        `✅ [${roomId}] ${displayName} wins the question! (+${points} points)`,
      );

      // Persist stats for authenticated users
      if (!isGuestPlayer(playerId)) {
        try {
          const stats = await updateUserStats(
            playerId,
            displayName,
            true,
            points,
          );
          updateAllLeaderboards(playerId, displayName, points).catch(
            console.error,
          );

          const consecutiveRunThisSession =
            session.playerConsecutiveRun.get(playerId) || 0;
          const context: BadgeCheckContext = {
            consecutiveRunThisSession,
          };
          const newBadges = await checkAndAwardBadges(playerId, stats, context);
          if (newBadges.length > 0) {
            const existing = session.pendingBadges.get(playerId) || [];
            session.pendingBadges.set(playerId, [...existing, ...newBadges]);
            const setExisting = session.setEarnedBadges.get(playerId) || [];
            session.setEarnedBadges.set(playerId, [
              ...setExisting,
              ...newBadges,
            ]);
          }
        } catch (error) {
          console.error(`Failed to persist stats for ${playerId}:`, error);
        }
      }

      // Clear the question timeout since we have a winner
      clearRoomTimers(session);

      // End question after short delay (allows others to still answer during this time)
      session.resultsTimeoutId = setTimeout(
        () => showRoomQuestionResults(roomId),
        1500,
      );
    } else {
      // Correct but not first - send them a "correct but too slow" event
      const userChannel = ably?.channels.get(
        `${ABLY_CHANNELS.USER_PREFIX}${playerId}`,
      );
      if (userChannel) {
        await userChannel.publish("correct_but_slow", {
          answerIndex,
          winnerName: session.questionWinnerName,
        });
      }
      console.log(
        `✅ [${roomId}] ${displayName} also correct, but ${session.questionWinnerName} was faster`,
      );
    }
  } else {
    // Wrong guess - apply escalating penalty
    playerState.guessCount++;
    playerState.wrongAnswers.push(answerIndex);

    const multiplier = getPenaltyMultiplier(playerState.guessCount);
    const basePenalty = difficultyPoints.wrong;
    const penalty = Math.round(basePenalty * multiplier);

    playerState.totalPenalty += penalty;

    const currentScore = session.scores.get(playerId) || 0;
    session.scores.set(playerId, currentScore + penalty);

    const wrongCount = session.playerWrongCount.get(playerId) || 0;
    session.playerWrongCount.set(playerId, wrongCount + 1);

    markQuestionAnsweredIncorrectly(question.id).catch((err) =>
      console.error(`Failed to mark question as incorrect:`, err),
    );

    console.log(
      `❌ [${roomId}] ${displayName} wrong guess #${playerState.guessCount} (${penalty} points, ${multiplier}x multiplier)`,
    );

    // Send wrong_answer event to the specific player via user channel
    const userChannel = ably?.channels.get(
      `${ABLY_CHANNELS.USER_PREFIX}${playerId}`,
    );
    if (userChannel) {
      const wrongAnswerPayload: WrongAnswerPayload = {
        answerIndex,
        penalty,
        guessCount: playerState.guessCount,
        wrongAnswers: playerState.wrongAnswers,
      };
      await userChannel.publish("wrong_answer", wrongAnswerPayload);
    }

    // Persist stats for authenticated users
    if (!isGuestPlayer(playerId)) {
      try {
        const stats = await updateUserStats(
          playerId,
          displayName,
          false,
          penalty,
        );
        updateAllLeaderboards(playerId, displayName, penalty).catch(
          console.error,
        );

        const context: BadgeCheckContext = {};
        const newBadges = await checkAndAwardBadges(playerId, stats, context);
        if (newBadges.length > 0) {
          const existing = session.pendingBadges.get(playerId) || [];
          session.pendingBadges.set(playerId, [...existing, ...newBadges]);
          const setExisting = session.setEarnedBadges.get(playerId) || [];
          session.setEarnedBadges.set(playerId, [...setExisting, ...newBadges]);
        }
      } catch (error) {
        console.error(`Failed to persist stats for ${playerId}:`, error);
      }
    }
  }
}

async function showRoomQuestionResults(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  session.questionPhase = "results";

  const question = session.questions[session.currentQuestionIndex];
  const scores: Record<string, number> = {};
  session.scores.forEach((score, id) => {
    scores[id] = score;
  });

  const earnedBadges: Record<string, string[]> = {};
  session.pendingBadges.forEach((badges, playerId) => {
    if (badges.length > 0) {
      earnedBadges[playerId] = badges;
    }
  });

  // Build per-player results for session tracking
  const playerResults: Record<string, { answered: boolean; correct: boolean }> =
    {};
  session.playerQuestionState.forEach((state, playerId) => {
    // Player attempted if they made any guesses OR answered correctly (first-try correct has guessCount 0)
    const attempted = state.guessCount > 0 || state.answeredCorrectly;
    // Player is correct only if they are the winner
    const correct = playerId === session.questionWinner;
    playerResults[playerId] = { answered: attempted, correct };
  });

  // Global wasAnswered/wasCorrect for backwards compat (will be overridden by frontend per-player lookup)
  const wasAnswered = session.questionWinner !== null;

  const payload: QuestionEndPayload = {
    correctIndex: question.correctIndex,
    explanation: question.explanation || "No explanation available.",
    scores,
    leaderboard: buildRoomLeaderboard(roomId),
    winnerId: session.questionWinner,
    winnerName: session.questionWinnerName,
    winnerPoints: session.questionWinnerPoints,
    wasAnswered,
    wasCorrect: wasAnswered ? true : null,
    playerResults,
    nextQuestionIn: getConfig().resultsDisplayMs,
    questionText: question.text,
    options: question.options,
    category: question.category,
    detailedExplanation: question.detailedExplanation,
    citationUrl: question.citationUrl,
    citationTitle: question.citationTitle,
    earnedBadges:
      Object.keys(earnedBadges).length > 0 ? earnedBadges : undefined,
  };

  await session.channel.publish("question_end", payload);
  const winStatus = session.questionWinner
    ? `Winner: ${session.questionWinnerName}`
    : "No winner";
  console.log(
    `📊 [${roomId}] Question ${session.currentQuestionIndex + 1} complete - ${winStatus}`,
  );

  session.pendingBadges.clear();

  // Clear any existing timer and set new one for next question
  clearRoomTimers(session);
  session.resultsTimeoutId = setTimeout(
    () => moveToNextRoomQuestion(roomId),
    getConfig().resultsDisplayMs,
  );
}

/**
 * Handle question timeout - no one answered correctly in time
 */
async function handleQuestionTimeUp(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  // Skip if question already won
  if (session.questionWinner) return;

  console.log(`⏰ [${roomId}] Time's up! No winner.`);
  await showRoomQuestionResults(roomId);
}

async function moveToNextRoomQuestion(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  session.currentQuestionIndex++;
  // Reset multi-guess state for new question
  session.playerQuestionState.clear();
  session.questionWinner = null;
  session.questionWinnerName = null;
  session.questionWinnerPoints = null;
  session.questionPhase = "waiting";
  session.questionStartTime = null;

  // Continue to next question (startRoomQuestion will fetch more if needed)
  await startRoomQuestion(roomId);
}

async function startRoomSet(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room) return;

  const channel = roomChannels.get(roomId);
  if (!channel) return;

  const setId = `set-${roomId}-${Date.now()}`;

  // Get questions from mixed categories, filtered by room difficulty
  const questionsUsed = new Set<string>();
  const QUESTIONS_BATCH_SIZE = 10;
  let questions: Question[];
  try {
    // Fetch a batch of questions (continuous play - no fixed set size)
    questions = await getQuestionsForMixedSet(
      QUESTIONS_BATCH_SIZE,
      room.difficulty,
      questionsUsed,
    );
    for (const q of questions) {
      questionsUsed.add(q.id);
    }
    console.log(
      `📚 [${roomId}] Got ${questions.length} ${room.difficulty} questions`,
    );
  } catch (error) {
    console.error(`❌ [${roomId}] Failed to get questions, using mock:`, error);
    questions = getMockQuestions(QUESTIONS_BATCH_SIZE);
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
    questionStartTime: null,
    questionPhase: "waiting",
    pendingBadges: new Map(),
    setEarnedBadges: new Map(),
    playerCorrectCount: new Map(),
    playerWrongCount: new Map(),
    questionsUsed,
    channel,
    setCompleted: false,
    // Will be calculated for each question
    currentQuestionDisplayMs: 0,
    // Consecutive question tracking
    playerLastQuestionAnswered: new Map(),
    playerConsecutiveRun: new Map(),
    // Multi-guess tracking
    playerQuestionState: new Map(),
    questionWinner: null,
    questionWinnerName: null,
    questionWinnerPoints: null,
    // Timer management
    questionTimeoutId: null,
    resultsTimeoutId: null,
  };

  roomSessions.set(roomId, session);

  // Get presence members
  try {
    const members = await channel.presence.get();
    for (const member of members) {
      if (member.clientId && !member.clientId.startsWith("game-")) {
        const player: Player = {
          id: member.clientId,
          displayName: member.data?.displayName || "Anonymous",
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

  setRoomStatus(roomId, "in_progress", setId);

  console.log(`\n🎮 [${roomId}] Starting set: ${setId}`);
  console.log(`👥 [${roomId}] Players: ${session.players.size}`);

  await channel.publish("set_start", {
    setId,
    totalQuestions: 0, // 0 = continuous play
    playerCount: session.players.size,
    roomName: room.name,
  });

  // Start first question immediately (no countdown)
  await startRoomQuestion(roomId);
}

async function startRoomQuestion(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  // If we've run out of questions, fetch more (continuous play)
  if (session.currentQuestionIndex >= session.questions.length) {
    console.log(
      `🔄 [${roomId}] Fetching more questions for continuous play...`,
    );
    const room = getRoom(roomId);
    const difficulty = room?.difficulty || "medium";
    const QUESTIONS_BATCH_SIZE = 10;
    const newQuestions = await getQuestionsForMixedSet(
      QUESTIONS_BATCH_SIZE,
      difficulty,
    );

    if (newQuestions.length === 0) {
      console.log(`❌ [${roomId}] No more questions available, ending set`);
      await endRoomSet(roomId);
      return;
    }

    // Add new questions to session
    session.questions = [...session.questions, ...newQuestions];
    console.log(
      `✅ [${roomId}] Added ${newQuestions.length} more questions (total: ${session.questions.length})`,
    );
  }

  const question = session.questions[session.currentQuestionIndex];

  // Calculate dynamic timing based on question and answer text length
  const questionDisplayMs = calculateQuestionDisplayTime(
    question.text,
    question.options,
  );

  // Store in session
  session.currentQuestionDisplayMs = questionDisplayMs;
  session.questionStartTime = Date.now();
  session.questionPhase = "question";
  // Reset multi-guess state for new question
  session.playerQuestionState.clear();
  session.questionWinner = null;
  session.questionWinnerName = null;

  const payload: QuestionStartPayload = {
    question: {
      id: question.id,
      text: question.text,
      options: question.options,
      category: question.category,
      difficulty: question.difficulty,
    },
    questionIndex: session.currentQuestionIndex,
    totalQuestions: 0, // 0 = continuous play (no fixed total)
    questionDuration: questionDisplayMs,
    answerTimeout: 0, // No longer used - players can answer immediately
  };

  await session.channel.publish("question_start", payload);
  console.log(
    `\n❓ [${roomId}] Q${session.currentQuestionIndex + 1}: ${question.text.substring(0, 50)}... (duration: ${questionDisplayMs}ms)`,
  );

  // Track that this question was asked (moves it to "used" bucket)
  markQuestionAsked(question.id, question.category).catch((err) =>
    console.error(`Failed to mark question as asked:`, err),
  );

  // Clear any stale timers from previous question
  clearRoomTimers(session);

  // When time is up, end the question if no winner
  session.questionTimeoutId = setTimeout(async () => {
    const currentSession = roomSessions.get(roomId);
    if (
      currentSession &&
      currentSession.questionPhase === "question" &&
      !currentSession.questionWinner
    ) {
      await handleQuestionTimeUp(roomId);
    }
  }, questionDisplayMs);
}

async function endRoomSet(roomId: string): Promise<void> {
  const session = roomSessions.get(roomId);
  if (!session) return;

  if (session.setCompleted) return;
  session.setCompleted = true;

  // Clear any pending timers
  clearRoomTimers(session);

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

  const payload: SetEndPayload = {
    finalScores,
    leaderboard,
    badgesSummary:
      Object.keys(badgesSummary).length > 0 ? badgesSummary : undefined,
  };

  await session.channel.publish("set_end", payload);

  console.log(`\n🏆 [${roomId}] Set complete!`);
  leaderboard.slice(0, 3).forEach((entry) => {
    console.log(`  ${entry.rank}. ${entry.displayName}: ${entry.score}`);
  });

  // Clean up current session
  roomSessions.delete(roomId);
  resetRoom(roomId);

  // Clear any queued players for this room
  roomQueues.delete(roomId);

  // Check if players are still present - start new set after short break
  const channel = roomChannels.get(roomId);
  if (channel) {
    try {
      const members = await channel.presence.get();
      const playerCount = members.filter(
        (m) => m.clientId && !m.clientId.startsWith("game-"),
      ).length;

      if (playerCount > 0) {
        console.log(
          `👥 [${roomId}] ${playerCount} players still present - starting new set in 10 seconds`,
        );
        // Short break, then start new set
        setTimeout(async () => {
          // Double-check players are still there
          try {
            const currentMembers = await channel.presence.get();
            const currentPlayerCount = currentMembers.filter(
              (m) => m.clientId && !m.clientId.startsWith("game-"),
            ).length;

            if (currentPlayerCount > 0 && !roomSessions.has(roomId)) {
              console.log(`🎮 [${roomId}] Starting new set!`);
              await startRoomSet(roomId);
            }
          } catch (e) {
            console.error(`Error checking presence for new set:`, e);
          }
        }, 10000);
      } else {
        console.log(
          `⏸️  [${roomId}] No players - waiting for next player to join`,
        );
      }
    } catch (e) {
      console.error(`Error checking presence after set end:`, e);
    }
  }
}

// ============ Game Loop ============

async function runGameLoop(): Promise<void> {
  let lastCleanupTime = 0;
  let lastConfigRefreshTime = 0;
  const CLEANUP_INTERVAL_MS = 60000; // Clean up completed sessions every minute
  const CONFIG_REFRESH_INTERVAL_MS = 60000; // Refresh config every minute

  while (!isShuttingDown) {
    lastHeartbeat = Date.now();
    const now = Date.now();

    // Periodic config refresh from DynamoDB
    if (now - lastConfigRefreshTime > CONFIG_REFRESH_INTERVAL_MS) {
      lastConfigRefreshTime = now;
      try {
        const config = await refreshConfig();
        // Update maintenance mode from config
        maintenanceMode = config.maintenanceMode;
        maintenanceMessage = config.maintenanceMessage;
      } catch (e) {
        console.error("Failed to refresh config:", e);
      }
    }

    // Periodic cleanup of completed sessions
    if (now - lastCleanupTime > CLEANUP_INTERVAL_MS) {
      lastCleanupTime = now;

      // Clean up completed sessions
      let cleanedSessions = 0;
      for (const [roomId, session] of roomSessions) {
        if (session.setCompleted) {
          roomSessions.delete(roomId);
          cleanedSessions++;
        }
      }
      if (cleanedSessions > 0) {
        console.log(
          `🧹 Cleaned ${cleanedSessions} completed sessions, ${roomSessions.size} active sessions remain`,
        );
      }
    }

    // Check for room overflow - create new room if all rooms of a difficulty are full
    const rooms = getRoomList();
    const availableRoom = rooms.find(
      (r) =>
        r.status === "waiting" &&
        r.currentPlayers < getConfig().maxPlayersPerRoom,
    );
    if (!availableRoom && lobbyPlayers.size > 0) {
      const newRoom = createRoom("medium");
      setupRoomChannel(newRoom.id);
      console.log(`🏠 Created new room (all full): ${newRoom.name}`);
    }

    // Write room list to DynamoDB for frontend polling (throttled to every 10s)
    await writeRoomListToDynamoDB();

    await sleep(1000);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============ Main Entry Point ============

async function main(): Promise<void> {
  console.log("🎯 Quiz Game Orchestrator Starting (Always-Open Rooms)...");
  // Load config from DynamoDB
  const config = await loadGameConfig();
  console.log(
    `📋 Config loaded: continuous play, max ${config.maxPlayersPerRoom} players per room`,
  );
  console.log(
    `🏠 Results display: ${config.resultsDisplayMs}ms, free tier limit: ${config.freeTierDailyLimit}/day`,
  );

  healthApp.listen(HEALTH_PORT, () => {
    console.log(`🏥 Health check server running on port ${HEALTH_PORT}`);
  });

  initAbly();

  await new Promise<void>((resolve) => {
    if (ably?.connection.state === "connected") {
      resolve();
    } else {
      ably?.connection.once("connected", () => resolve());
    }
  });

  console.log("🚀 Starting game loop...\n");
  await runGameLoop();
}

main().catch(console.error);

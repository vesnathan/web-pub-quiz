/**
 * Zod validation schemas for API responses
 *
 * These schemas validate GraphQL responses at runtime.
 * For TypeScript types, import from @quiz/shared (codegen types).
 */
import { z } from "zod";

// ============================================
// User Schemas (matching codegen User, UserPublic, etc.)
// ============================================

export const UserStatsSchema = z.object({
  totalCorrect: z.number(),
  totalWrong: z.number(),
  totalPoints: z.number(),
  setsPlayed: z.number(),
  setsWon: z.number(),
  currentStreak: z.number(),
  longestStreak: z.number(),
});

export const BadgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  groupId: z.string(),
  tier: z.number(),
  rarity: z.enum(["common", "uncommon", "rare", "epic", "legendary"]),
  skillPoints: z.number(),
  earnedAt: z.string(),
});

export const UserSubscriptionSchema = z.object({
  tier: z.number(),
  status: z
    .enum(["active", "cancelled", "past_due", "trialing"])
    .nullable()
    .optional(),
  provider: z.enum(["stripe", "paypal"]).nullable().optional(),
  subscriptionId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  startedAt: z.string().nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  cancelledAt: z.string().nullable().optional(),
  giftedBy: z.string().nullable().optional(),
  giftedByName: z.string().nullable().optional(),
  giftedAt: z.string().nullable().optional(),
  giftExpiresAt: z.string().nullable().optional(),
  giftNotificationSeen: z.boolean().nullable().optional(),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string(),
  username: z.string().optional(),
  displayName: z.string(),
  createdAt: z.string(),
  stats: UserStatsSchema,
  subscription: UserSubscriptionSchema,
  badges: z.array(BadgeSchema),
  totalSkillPoints: z.number(),
  tipUnlockedUntil: z.string().nullable().optional(),
});

export const UserPublicSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  displayName: z.string(),
  stats: UserStatsSchema,
  badges: z.array(BadgeSchema).optional(),
  totalSkillPoints: z.number().optional(),
});

// ============================================
// Leaderboard Schemas
// ============================================

export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  userId: z.string(),
  username: z.string().optional(),
  displayName: z.string(),
  score: z.number(),
  avatarUrl: z.string().nullable().optional(),
  memberSince: z.string().nullable().optional(),
});

export const LeaderboardSchema = z.object({
  type: z.enum(["DAILY", "WEEKLY", "ALL_TIME"]),
  entries: z.array(LeaderboardEntrySchema),
  updatedAt: z.string(),
});

// ============================================
// Chat Schemas
// ============================================

export const ChatMessageSchema = z.object({
  id: z.string(),
  channelId: z.string(),
  senderId: z.string(),
  senderUsername: z.string(),
  senderDisplayName: z.string(),
  content: z.string(),
  createdAt: z.string(),
});

export const ChatMessagesResponseSchema = z.object({
  items: z.array(ChatMessageSchema),
  nextToken: z.string().nullable(),
});

export const ConversationParticipantSchema = z.object({
  id: z.string(),
  username: z.string().optional(),
  displayName: z.string(),
});

export const ConversationSchema = z.object({
  id: z.string(),
  participantIds: z.array(z.string()),
  participants: z.array(ConversationParticipantSchema),
  lastMessage: ChatMessageSchema.nullable().optional(),
  updatedAt: z.string(),
});

// ============================================
// Game State Schemas
// ============================================

export const GameStateSchema = z.object({
  isSetActive: z.boolean(),
  currentSetId: z.string().nullable().optional(),
  nextSetTime: z.string(),
  playerCount: z.number(),
});

export const AblyTokenResponseSchema = z.object({
  token: z.string(),
  expires: z.string(),
  duplicateSession: z.boolean().optional(),
  duplicateIp: z.boolean().optional(),
});

// ============================================
// Checkout Schemas
// ============================================

export const CheckoutSessionSchema = z.object({
  checkoutUrl: z.string(),
  sessionId: z.string().nullable().optional(),
});

// ============================================
// Webhook Schemas
// ============================================

export const WebhookLogSchema = z.object({
  eventId: z.string(),
  provider: z.string(),
  eventType: z.string(),
  payload: z.string(),
  status: z.string(),
  errorMessage: z.string().nullable().optional(),
  createdAt: z.string(),
});

export const WebhookLogConnectionSchema = z.object({
  items: z.array(WebhookLogSchema),
  nextToken: z.string().nullable().optional(),
});

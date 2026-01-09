import { describe, it, expect } from "vitest";
import {
  UserStatsSchema,
  BadgeSchema,
  UserSubscriptionSchema,
  UserSchema,
  UserPublicSchema,
  LeaderboardEntrySchema,
  LeaderboardSchema,
  ChatMessageSchema,
  GameStateSchema,
  AblyTokenResponseSchema,
  CheckoutSessionSchema,
  WebhookLogSchema,
} from "./ValidationSchemas";

describe("UserStatsSchema", () => {
  it("validates correct user stats", () => {
    const stats = {
      totalCorrect: 100,
      totalWrong: 20,
      totalPoints: 3500,
      setsPlayed: 10,
      setsWon: 5,
      currentStreak: 3,
      longestStreak: 7,
    };
    const result = UserStatsSchema.safeParse(stats);
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const stats = {
      totalCorrect: 100,
      totalWrong: 20,
    };
    const result = UserStatsSchema.safeParse(stats);
    expect(result.success).toBe(false);
  });

  it("rejects non-numeric values", () => {
    const stats = {
      totalCorrect: "many",
      totalWrong: 20,
      totalPoints: 3500,
      setsPlayed: 10,
      setsWon: 5,
      currentStreak: 3,
      longestStreak: 7,
    };
    const result = UserStatsSchema.safeParse(stats);
    expect(result.success).toBe(false);
  });
});

describe("BadgeSchema", () => {
  it("validates correct badge", () => {
    const badge = {
      id: "streak_3_wins",
      name: "Hat Trick",
      description: "Win 3 sets in a row",
      icon: "trophy",
      groupId: "streak",
      tier: 1,
      rarity: "uncommon",
      skillPoints: 50,
      earnedAt: "2024-01-15T10:30:00Z",
    };
    const result = BadgeSchema.safeParse(badge);
    expect(result.success).toBe(true);
  });

  it("accepts all valid rarity values", () => {
    const rarities = ["common", "uncommon", "rare", "epic", "legendary"];
    rarities.forEach((rarity) => {
      const badge = {
        id: "test",
        name: "Test",
        description: "Test",
        icon: "star",
        groupId: "test",
        tier: 1,
        rarity,
        skillPoints: 10,
        earnedAt: "2024-01-01T00:00:00Z",
      };
      const result = BadgeSchema.safeParse(badge);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid rarity", () => {
    const badge = {
      id: "test",
      name: "Test",
      description: "Test",
      icon: "star",
      groupId: "test",
      tier: 1,
      rarity: "super-rare",
      skillPoints: 10,
      earnedAt: "2024-01-01T00:00:00Z",
    };
    const result = BadgeSchema.safeParse(badge);
    expect(result.success).toBe(false);
  });
});

describe("UserSubscriptionSchema", () => {
  it("validates active subscription", () => {
    const subscription = {
      tier: 1,
      status: "active",
      provider: "stripe",
      subscriptionId: "sub_123",
      customerId: "cus_456",
      startedAt: "2024-01-01T00:00:00Z",
      expiresAt: "2024-02-01T00:00:00Z",
    };
    const result = UserSubscriptionSchema.safeParse(subscription);
    expect(result.success).toBe(true);
  });

  it("validates free tier (minimal data)", () => {
    const subscription = {
      tier: 0,
    };
    const result = UserSubscriptionSchema.safeParse(subscription);
    expect(result.success).toBe(true);
  });

  it("validates gifted subscription", () => {
    const subscription = {
      tier: 1,
      giftedBy: "user123",
      giftedByName: "John",
      giftedAt: "2024-01-01T00:00:00Z",
      giftExpiresAt: "2024-01-08T00:00:00Z",
      giftNotificationSeen: false,
    };
    const result = UserSubscriptionSchema.safeParse(subscription);
    expect(result.success).toBe(true);
  });

  it("accepts valid status values", () => {
    const statuses = ["active", "cancelled", "past_due", "trialing"];
    statuses.forEach((status) => {
      const subscription = { tier: 1, status };
      const result = UserSubscriptionSchema.safeParse(subscription);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid provider", () => {
    const subscription = {
      tier: 1,
      provider: "bitcoin",
    };
    const result = UserSubscriptionSchema.safeParse(subscription);
    expect(result.success).toBe(false);
  });
});

describe("UserPublicSchema", () => {
  it("validates public user data", () => {
    const user = {
      id: "user123",
      displayName: "John Doe",
      stats: {
        totalCorrect: 100,
        totalWrong: 20,
        totalPoints: 3500,
        setsPlayed: 10,
        setsWon: 5,
        currentStreak: 3,
        longestStreak: 7,
      },
    };
    const result = UserPublicSchema.safeParse(user);
    expect(result.success).toBe(true);
  });

  it("accepts optional username", () => {
    const user = {
      id: "user123",
      username: "johndoe",
      displayName: "John Doe",
      stats: {
        totalCorrect: 100,
        totalWrong: 20,
        totalPoints: 3500,
        setsPlayed: 10,
        setsWon: 5,
        currentStreak: 3,
        longestStreak: 7,
      },
    };
    const result = UserPublicSchema.safeParse(user);
    expect(result.success).toBe(true);
  });
});

describe("LeaderboardSchema", () => {
  it("validates leaderboard with entries", () => {
    const leaderboard = {
      type: "DAILY",
      entries: [
        {
          rank: 1,
          userId: "user1",
          displayName: "Champion",
          score: 5000,
        },
        {
          rank: 2,
          userId: "user2",
          displayName: "Runner Up",
          score: 4500,
        },
      ],
      updatedAt: "2024-01-15T12:00:00Z",
    };
    const result = LeaderboardSchema.safeParse(leaderboard);
    expect(result.success).toBe(true);
  });

  it("accepts all valid leaderboard types", () => {
    const types = ["DAILY", "WEEKLY", "ALL_TIME"];
    types.forEach((type) => {
      const leaderboard = {
        type,
        entries: [],
        updatedAt: "2024-01-15T12:00:00Z",
      };
      const result = LeaderboardSchema.safeParse(leaderboard);
      expect(result.success).toBe(true);
    });
  });

  it("rejects invalid leaderboard type", () => {
    const leaderboard = {
      type: "MONTHLY",
      entries: [],
      updatedAt: "2024-01-15T12:00:00Z",
    };
    const result = LeaderboardSchema.safeParse(leaderboard);
    expect(result.success).toBe(false);
  });
});

describe("ChatMessageSchema", () => {
  it("validates chat message", () => {
    const message = {
      id: "msg123",
      channelId: "channel456",
      senderId: "user789",
      senderUsername: "johndoe",
      senderDisplayName: "John Doe",
      content: "Hello everyone!",
      createdAt: "2024-01-15T10:30:00Z",
    };
    const result = ChatMessageSchema.safeParse(message);
    expect(result.success).toBe(true);
  });

  it("rejects missing content", () => {
    const message = {
      id: "msg123",
      channelId: "channel456",
      senderId: "user789",
      senderUsername: "johndoe",
      senderDisplayName: "John Doe",
      createdAt: "2024-01-15T10:30:00Z",
    };
    const result = ChatMessageSchema.safeParse(message);
    expect(result.success).toBe(false);
  });
});

describe("GameStateSchema", () => {
  it("validates active game state", () => {
    const state = {
      isSetActive: true,
      currentSetId: "set123",
      nextSetTime: "2024-01-15T13:00:00Z",
      playerCount: 15,
    };
    const result = GameStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("validates inactive game state", () => {
    const state = {
      isSetActive: false,
      currentSetId: null,
      nextSetTime: "2024-01-15T13:00:00Z",
      playerCount: 0,
    };
    const result = GameStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });
});

describe("AblyTokenResponseSchema", () => {
  it("validates token response", () => {
    const response = {
      token: "xVLyHw.abc123",
      expires: "2024-01-15T11:00:00Z",
    };
    const result = AblyTokenResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("accepts optional duplicate session flags", () => {
    const response = {
      token: "xVLyHw.abc123",
      expires: "2024-01-15T11:00:00Z",
      duplicateSession: true,
      duplicateIp: false,
    };
    const result = AblyTokenResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("CheckoutSessionSchema", () => {
  it("validates checkout session", () => {
    const session = {
      checkoutUrl: "https://checkout.stripe.com/pay/cs_test_123",
      sessionId: "cs_test_123",
    };
    const result = CheckoutSessionSchema.safeParse(session);
    expect(result.success).toBe(true);
  });

  it("accepts session without sessionId", () => {
    const session = {
      checkoutUrl: "https://www.paypal.com/checkoutnow?token=123",
    };
    const result = CheckoutSessionSchema.safeParse(session);
    expect(result.success).toBe(true);
  });
});

describe("WebhookLogSchema", () => {
  it("validates webhook log entry", () => {
    const log = {
      eventId: "evt_123",
      provider: "stripe",
      eventType: "checkout.session.completed",
      payload: '{"id":"evt_123"}',
      status: "processed",
      createdAt: "2024-01-15T10:30:00Z",
    };
    const result = WebhookLogSchema.safeParse(log);
    expect(result.success).toBe(true);
  });

  it("accepts log with error message", () => {
    const log = {
      eventId: "evt_456",
      provider: "paypal",
      eventType: "PAYMENT.SALE.COMPLETED",
      payload: "{}",
      status: "error",
      errorMessage: "Invalid signature",
      createdAt: "2024-01-15T10:30:00Z",
    };
    const result = WebhookLogSchema.safeParse(log);
    expect(result.success).toBe(true);
  });
});

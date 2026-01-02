/**
 * API Layer - Re-exports all API functions
 *
 * This is the single entry point for all API operations.
 * All GraphQL calls should go through these functions, which:
 * 1. Import queries/mutations from /graphql
 * 2. Validate responses with Zod schemas
 * 3. Return typed, validated data
 *
 * NOTE: Types should be imported directly from @quiz/shared, not from here.
 */

// User operations
export {
  getMyProfile,
  getUserProfile,
  checkDisplayNameAvailable,
  checkEmailHasGoogleAccount,
  updateDisplayName,
  ensureProfile,
} from "./users";

// Chat operations
export {
  getChatMessages,
  getMyConversations,
  sendChatMessage,
  startConversation,
  subscribeToChatMessages,
} from "./chat";

// Subscription operations
export {
  createCheckoutSession,
  createTipCheckout,
  markGiftNotificationSeen,
} from "./subscription";

// Admin operations
export {
  adminGiftSubscription,
  adminUpdateUserTier,
  getWebhookLogs,
} from "./admin";

// Leaderboard operations
export { getLeaderboard, getMyRank } from "./leaderboard";

// Game operations
export { getGameState, getAblyToken } from "./game";

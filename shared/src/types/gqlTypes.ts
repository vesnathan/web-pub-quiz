export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AblyTokenResponse = {
  duplicateIp?: Maybe<Scalars['Boolean']['output']>;
  duplicateSession?: Maybe<Scalars['Boolean']['output']>;
  expires: Scalars['String']['output'];
  token: Scalars['String']['output'];
};

export enum AwardRarity {
  common = 'common',
  epic = 'epic',
  legendary = 'legendary',
  rare = 'rare',
  uncommon = 'uncommon'
}

export type Badge = {
  description: Scalars['String']['output'];
  earnedAt: Scalars['String']['output'];
  groupId: Scalars['String']['output'];
  icon: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  rarity: AwardRarity;
  skillPoints: Scalars['Int']['output'];
  tier: Scalars['Int']['output'];
};

export type BadgeDefinition = {
  description: Scalars['String']['output'];
  groupId: Scalars['String']['output'];
  icon: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  rarity: AwardRarity;
  requirement: Scalars['Int']['output'];
  skillPoints: Scalars['Int']['output'];
  tier: Scalars['Int']['output'];
};

export type BadgeGroup = {
  badges: Array<BadgeDefinition>;
  description: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  showHighestOnly: Scalars['Boolean']['output'];
};

export type ChatMessage = {
  channelId: Scalars['ID']['output'];
  content: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  senderDisplayName: Scalars['String']['output'];
  senderId: Scalars['ID']['output'];
  senderUsername: Scalars['String']['output'];
};

export type ChatMessageConnection = {
  items: Array<ChatMessage>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type CheckoutSession = {
  checkoutUrl: Scalars['String']['output'];
  sessionId?: Maybe<Scalars['String']['output']>;
};

export type Conversation = {
  id: Scalars['ID']['output'];
  lastMessage?: Maybe<ChatMessage>;
  participantIds: Array<Scalars['ID']['output']>;
  participants: Array<UserPublic>;
  updatedAt: Scalars['String']['output'];
};

export type CreateCheckoutInput = {
  cancelUrl: Scalars['String']['input'];
  provider: SubscriptionProvider;
  successUrl: Scalars['String']['input'];
  tier: Scalars['Int']['input'];
};

export type CreateQuestionInput = {
  category: Scalars['String']['input'];
  correctIndex: Scalars['Int']['input'];
  difficulty: Scalars['String']['input'];
  explanation?: InputMaybe<Scalars['String']['input']>;
  options: Array<Scalars['String']['input']>;
  text: Scalars['String']['input'];
};

export type GameState = {
  currentSetId?: Maybe<Scalars['String']['output']>;
  isSetActive: Scalars['Boolean']['output'];
  nextSetTime: Scalars['String']['output'];
  playerCount: Scalars['Int']['output'];
};

export type GiftSubscriptionInput = {
  durationDays: Scalars['Int']['input'];
  message?: InputMaybe<Scalars['String']['input']>;
  recipientUserId: Scalars['ID']['input'];
  tier: Scalars['Int']['input'];
};

export type Leaderboard = {
  entries: Array<LeaderboardEntry>;
  type: LeaderboardType;
  updatedAt: Scalars['String']['output'];
};

export type LeaderboardEntry = {
  avatarUrl?: Maybe<Scalars['String']['output']>;
  displayName: Scalars['String']['output'];
  memberSince?: Maybe<Scalars['String']['output']>;
  rank: Scalars['Int']['output'];
  score: Scalars['Int']['output'];
  userId: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};

export enum LeaderboardType {
  ALL_TIME = 'ALL_TIME',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY'
}

export type Mutation = {
  adminGiftSubscription?: Maybe<User>;
  adminUpdateUserTier?: Maybe<User>;
  createCheckoutSession?: Maybe<CheckoutSession>;
  createQuestion?: Maybe<Question>;
  createTipCheckout?: Maybe<CheckoutSession>;
  ensureProfile?: Maybe<User>;
  markGiftNotificationSeen?: Maybe<Scalars['Boolean']['output']>;
  seedQuestions?: Maybe<Scalars['Int']['output']>;
  sendChatMessage?: Maybe<ChatMessage>;
  startConversation?: Maybe<Conversation>;
  updateDisplayName?: Maybe<User>;
};


export type MutationAdminGiftSubscriptionArgs = {
  input: GiftSubscriptionInput;
};


export type MutationAdminUpdateUserTierArgs = {
  tier: Scalars['Int']['input'];
  userId: Scalars['ID']['input'];
};


export type MutationCreateCheckoutSessionArgs = {
  input: CreateCheckoutInput;
};


export type MutationCreateQuestionArgs = {
  input: CreateQuestionInput;
};


export type MutationCreateTipCheckoutArgs = {
  provider: SubscriptionProvider;
};


export type MutationEnsureProfileArgs = {
  displayName: Scalars['String']['input'];
};


export type MutationSeedQuestionsArgs = {
  questions: Array<CreateQuestionInput>;
};


export type MutationSendChatMessageArgs = {
  channelId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
};


export type MutationStartConversationArgs = {
  targetUserId: Scalars['ID']['input'];
};


export type MutationUpdateDisplayNameArgs = {
  displayName: Scalars['String']['input'];
};

export type Query = {
  checkDisplayNameAvailable: Scalars['Boolean']['output'];
  checkEmailHasGoogleAccount: Scalars['Boolean']['output'];
  getAblyToken?: Maybe<AblyTokenResponse>;
  getChatMessages?: Maybe<ChatMessageConnection>;
  getGameState?: Maybe<GameState>;
  getLeaderboard?: Maybe<Leaderboard>;
  getMyConversations: Array<Conversation>;
  getMyProfile?: Maybe<User>;
  getMyRank?: Maybe<Scalars['Int']['output']>;
  getUserProfile?: Maybe<UserPublic>;
  getWebhookLogs: WebhookLogConnection;
  listQuestions?: Maybe<QuestionConnection>;
};


export type QueryCheckDisplayNameAvailableArgs = {
  displayName: Scalars['String']['input'];
};


export type QueryCheckEmailHasGoogleAccountArgs = {
  email: Scalars['String']['input'];
};


export type QueryGetChatMessagesArgs = {
  channelId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
};


export type QueryGetLeaderboardArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  type: LeaderboardType;
};


export type QueryGetMyConversationsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetMyRankArgs = {
  type: LeaderboardType;
};


export type QueryGetUserProfileArgs = {
  userId: Scalars['ID']['input'];
};


export type QueryGetWebhookLogsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
  provider?: InputMaybe<Scalars['String']['input']>;
};


export type QueryListQuestionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
};

export type Question = {
  category: Scalars['String']['output'];
  correctIndex: Scalars['Int']['output'];
  difficulty: Scalars['String']['output'];
  explanation?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  options: Array<Scalars['String']['output']>;
  text: Scalars['String']['output'];
};

export type QuestionConnection = {
  items: Array<Question>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type Subscription = {
  onNewChatMessage?: Maybe<ChatMessage>;
};


export type SubscriptionOnNewChatMessageArgs = {
  channelId: Scalars['ID']['input'];
};

export enum SubscriptionProvider {
  paypal = 'paypal',
  stripe = 'stripe'
}

export enum SubscriptionStatus {
  active = 'active',
  cancelled = 'cancelled',
  past_due = 'past_due',
  trialing = 'trialing'
}

export type User = {
  badges: Array<Badge>;
  createdAt: Scalars['String']['output'];
  displayName: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  stats: UserStats;
  subscription: UserSubscription;
  tipUnlockedUntil?: Maybe<Scalars['String']['output']>;
  totalSkillPoints: Scalars['Int']['output'];
  username: Scalars['String']['output'];
};

export type UserBadgeSummary = {
  badgeCount: Scalars['Int']['output'];
  badges: Array<Badge>;
  totalSkillPoints: Scalars['Int']['output'];
};

export type UserPublic = {
  badges: Array<Badge>;
  displayName: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  stats: UserStats;
  totalSkillPoints: Scalars['Int']['output'];
  username: Scalars['String']['output'];
};

export type UserStats = {
  currentStreak: Scalars['Int']['output'];
  longestStreak: Scalars['Int']['output'];
  setsPlayed: Scalars['Int']['output'];
  setsWon: Scalars['Int']['output'];
  totalCorrect: Scalars['Int']['output'];
  totalPoints: Scalars['Int']['output'];
  totalWrong: Scalars['Int']['output'];
};

export type UserSubscription = {
  cancelledAt?: Maybe<Scalars['String']['output']>;
  customerId?: Maybe<Scalars['String']['output']>;
  expiresAt?: Maybe<Scalars['String']['output']>;
  giftExpiresAt?: Maybe<Scalars['String']['output']>;
  giftNotificationSeen?: Maybe<Scalars['Boolean']['output']>;
  giftedAt?: Maybe<Scalars['String']['output']>;
  giftedBy?: Maybe<Scalars['String']['output']>;
  giftedByName?: Maybe<Scalars['String']['output']>;
  provider?: Maybe<SubscriptionProvider>;
  startedAt?: Maybe<Scalars['String']['output']>;
  status?: Maybe<SubscriptionStatus>;
  subscriptionId?: Maybe<Scalars['String']['output']>;
  tier: Scalars['Int']['output'];
};

export type WebhookLog = {
  createdAt: Scalars['String']['output'];
  errorMessage?: Maybe<Scalars['String']['output']>;
  eventId: Scalars['ID']['output'];
  eventType: Scalars['String']['output'];
  payload: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type WebhookLogConnection = {
  items: Array<WebhookLog>;
  nextToken?: Maybe<Scalars['String']['output']>;
};

export type UpdateDisplayNameMutationVariables = Exact<{
  displayName: Scalars['String']['input'];
}>;


export type UpdateDisplayNameMutation = { updateDisplayName?: { id: string, displayName: string } | null };

export type EnsureProfileMutationVariables = Exact<{
  displayName: Scalars['String']['input'];
}>;


export type EnsureProfileMutation = { ensureProfile?: { id: string, email: string, displayName: string, createdAt: string, stats: { totalCorrect: number, totalWrong: number, totalPoints: number, setsPlayed: number, setsWon: number, currentStreak: number, longestStreak: number }, subscription: { tier: number, status?: SubscriptionStatus | null, provider?: SubscriptionProvider | null, subscriptionId?: string | null, customerId?: string | null, startedAt?: string | null, expiresAt?: string | null, cancelledAt?: string | null } } | null };

export type CreateCheckoutSessionMutationVariables = Exact<{
  input: CreateCheckoutInput;
}>;


export type CreateCheckoutSessionMutation = { createCheckoutSession?: { checkoutUrl: string, sessionId?: string | null } | null };

export type SendChatMessageMutationVariables = Exact<{
  channelId: Scalars['ID']['input'];
  content: Scalars['String']['input'];
}>;


export type SendChatMessageMutation = { sendChatMessage?: { id: string, channelId: string, senderId: string, senderDisplayName: string, content: string, createdAt: string } | null };

export type StartConversationMutationVariables = Exact<{
  targetUserId: Scalars['ID']['input'];
}>;


export type StartConversationMutation = { startConversation?: { id: string, participantIds: Array<string>, updatedAt: string, participants: Array<{ id: string, displayName: string }> } | null };

export type AdminGiftSubscriptionMutationVariables = Exact<{
  input: GiftSubscriptionInput;
}>;


export type AdminGiftSubscriptionMutation = { adminGiftSubscription?: { id: string, displayName: string, email: string, subscription: { tier: number, status?: SubscriptionStatus | null, startedAt?: string | null, expiresAt?: string | null, giftedBy?: string | null, giftedByName?: string | null, giftedAt?: string | null, giftExpiresAt?: string | null, giftNotificationSeen?: boolean | null } } | null };

export type AdminUpdateUserTierMutationVariables = Exact<{
  userId: Scalars['ID']['input'];
  tier: Scalars['Int']['input'];
}>;


export type AdminUpdateUserTierMutation = { adminUpdateUserTier?: { id: string, subscription: { tier: number, status?: SubscriptionStatus | null } } | null };

export type MarkGiftNotificationSeenMutationVariables = Exact<{ [key: string]: never; }>;


export type MarkGiftNotificationSeenMutation = { markGiftNotificationSeen?: boolean | null };

export type CreateTipCheckoutMutationVariables = Exact<{
  provider: SubscriptionProvider;
}>;


export type CreateTipCheckoutMutation = { createTipCheckout?: { checkoutUrl: string, sessionId?: string | null } | null };

export type GetMyProfileQueryVariables = Exact<{ [key: string]: never; }>;


export type GetMyProfileQuery = { getMyProfile?: { id: string, email: string, displayName: string, createdAt: string, totalSkillPoints: number, tipUnlockedUntil?: string | null, stats: { totalCorrect: number, totalWrong: number, totalPoints: number, setsPlayed: number, setsWon: number, currentStreak: number, longestStreak: number }, subscription: { tier: number, status?: SubscriptionStatus | null, provider?: SubscriptionProvider | null, subscriptionId?: string | null, customerId?: string | null, startedAt?: string | null, expiresAt?: string | null, cancelledAt?: string | null, giftedBy?: string | null, giftedByName?: string | null, giftedAt?: string | null, giftExpiresAt?: string | null, giftNotificationSeen?: boolean | null }, badges: Array<{ id: string, name: string, description: string, icon: string, groupId: string, tier: number, rarity: AwardRarity, skillPoints: number, earnedAt: string }> } | null };

export type GetUserProfileQueryVariables = Exact<{
  userId: Scalars['ID']['input'];
}>;


export type GetUserProfileQuery = { getUserProfile?: { id: string, displayName: string, stats: { totalCorrect: number, totalWrong: number, totalPoints: number, setsPlayed: number, setsWon: number, currentStreak: number, longestStreak: number } } | null };

export type CheckDisplayNameAvailableQueryVariables = Exact<{
  displayName: Scalars['String']['input'];
}>;


export type CheckDisplayNameAvailableQuery = { checkDisplayNameAvailable: boolean };

export type CheckEmailHasGoogleAccountQueryVariables = Exact<{
  email: Scalars['String']['input'];
}>;


export type CheckEmailHasGoogleAccountQuery = { checkEmailHasGoogleAccount: boolean };

export type GetLeaderboardQueryVariables = Exact<{
  type: LeaderboardType;
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetLeaderboardQuery = { getLeaderboard?: { type: LeaderboardType, updatedAt: string, entries: Array<{ rank: number, userId: string, displayName: string, score: number }> } | null };

export type GetMyRankQueryVariables = Exact<{
  type: LeaderboardType;
}>;


export type GetMyRankQuery = { getMyRank?: number | null };

export type GetGameStateQueryVariables = Exact<{ [key: string]: never; }>;


export type GetGameStateQuery = { getGameState?: { isSetActive: boolean, currentSetId?: string | null, nextSetTime: string, playerCount: number } | null };

export type GetAblyTokenQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAblyTokenQuery = { getAblyToken?: { token: string, expires: string } | null };

export type GetChatMessagesQueryVariables = Exact<{
  channelId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetChatMessagesQuery = { getChatMessages?: { nextToken?: string | null, items: Array<{ id: string, channelId: string, senderId: string, senderUsername: string, senderDisplayName: string, content: string, createdAt: string }> } | null };

export type GetMyConversationsQueryVariables = Exact<{
  limit?: InputMaybe<Scalars['Int']['input']>;
}>;


export type GetMyConversationsQuery = { getMyConversations: Array<{ id: string, participantIds: Array<string>, updatedAt: string, participants: Array<{ id: string, displayName: string }>, lastMessage?: { id: string, content: string, createdAt: string, senderDisplayName: string } | null }> };

export type GetWebhookLogsQueryVariables = Exact<{
  provider?: InputMaybe<Scalars['String']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  nextToken?: InputMaybe<Scalars['String']['input']>;
}>;


export type GetWebhookLogsQuery = { getWebhookLogs: { nextToken?: string | null, items: Array<{ eventId: string, provider: string, eventType: string, payload: string, status: string, errorMessage?: string | null, createdAt: string }> } };

export type OnNewChatMessageSubscriptionVariables = Exact<{
  channelId: Scalars['ID']['input'];
}>;


export type OnNewChatMessageSubscription = { onNewChatMessage?: { id: string, channelId: string, senderId: string, senderUsername: string, senderDisplayName: string, content: string, createdAt: string } | null };

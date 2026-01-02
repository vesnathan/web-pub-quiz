import { Context, util } from '@aws-appsync/utils';

type Identity = {
  sub?: string;
  groups?: string[];
  claims?: {
    'cognito:username'?: string;
    email?: string;
  };
};

type GiftSubscriptionInput = {
  recipientUserId: string;
  tier: number;
  durationDays: number;
  message?: string;
};

type Args = {
  input: GiftSubscriptionInput;
};

/**
 * Admin-only mutation to gift a subscription to a user.
 * Sets the user's tier for a specified duration.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as Identity | undefined;
  const groups = identity?.groups || [];
  const adminUserId = identity?.sub || '';
  const adminEmail = identity?.claims?.email || identity?.claims?.['cognito:username'] || 'Admin';

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

  const { recipientUserId, tier, durationDays } = ctx.arguments.input;

  // Validate tier value
  if (tier < 1 || tier > 2) {
    return util.error('Invalid tier: must be 1 (Supporter) or 2 (Champion)', 'ValidationError');
  }

  // Validate duration
  if (durationDays < 1 || durationDays > 365) {
    return util.error('Invalid duration: must be between 1 and 365 days', 'ValidationError');
  }

  const now = util.time.nowISO8601();

  // Calculate expiration date
  // Convert duration to milliseconds and add to current time
  const nowMs = util.time.parseISO8601ToEpochMilliSeconds(now);
  const durationMs = durationDays * 24 * 60 * 60 * 1000;
  const expiresAtMs = nowMs + durationMs;
  const expiresAt = util.time.epochMilliSecondsToISO8601(expiresAtMs);

  // Get admin display name for giftedByName (will be stored with the gift)
  const giftedByName = adminEmail.split('@')[0]; // Simple fallback

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `USER#${recipientUserId}`,
      SK: 'PROFILE',
    }),
    update: {
      expression: `SET
        #sub.#tier = :tier,
        #sub.#status = :status,
        #sub.#startedAt = :now,
        #sub.#expiresAt = :expiresAt,
        #sub.#giftedBy = :giftedBy,
        #sub.#giftedByName = :giftedByName,
        #sub.#giftedAt = :now,
        #sub.#giftExpiresAt = :expiresAt,
        #sub.#giftNotificationSeen = :notificationSeen,
        updatedAt = :now`,
      expressionNames: {
        '#sub': 'subscription',
        '#tier': 'tier',
        '#status': 'status',
        '#startedAt': 'startedAt',
        '#expiresAt': 'expiresAt',
        '#giftedBy': 'giftedBy',
        '#giftedByName': 'giftedByName',
        '#giftedAt': 'giftedAt',
        '#giftExpiresAt': 'giftExpiresAt',
        '#giftNotificationSeen': 'giftNotificationSeen',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':tier': tier,
        ':status': 'active',
        ':now': now,
        ':expiresAt': expiresAt,
        ':giftedBy': adminUserId,
        ':giftedByName': giftedByName,
        ':notificationSeen': false,
      }),
    },
    condition: {
      expression: 'attribute_exists(PK)',
    },
  };
}

interface UserItem {
  PK?: string;
  id?: string;
  email?: string;
  displayName?: string;
  createdAt?: string;
  stats?: {
    totalCorrect?: number;
    totalWrong?: number;
    totalPoints?: number;
    setsPlayed?: number;
    setsWon?: number;
    currentStreak?: number;
    longestStreak?: number;
  };
  subscription?: {
    tier?: number;
    status?: string | null;
    provider?: string | null;
    subscriptionId?: string | null;
    customerId?: string | null;
    startedAt?: string | null;
    expiresAt?: string | null;
    cancelledAt?: string | null;
    giftedBy?: string | null;
    giftedByName?: string | null;
    giftedAt?: string | null;
    giftExpiresAt?: string | null;
    giftNotificationSeen?: boolean | null;
  };
  badges?: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: string;
    skillPoints: number;
  }>;
  totalSkillPoints?: number;
  tipUnlockedUntil?: string | null;
}

export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  const item = ctx.result as UserItem | null;
  if (!item) {
    return util.error('User not found', 'NotFoundError');
  }

  const userId = item.PK ? item.PK.replace('USER#', '') : item.id || '';

  return {
    id: userId,
    email: item.email || '',
    username: item.displayName || '',
    displayName: item.displayName || '',
    createdAt: item.createdAt || '',
    stats: {
      totalCorrect: item.stats?.totalCorrect || 0,
      totalWrong: item.stats?.totalWrong || 0,
      totalPoints: item.stats?.totalPoints || 0,
      setsPlayed: item.stats?.setsPlayed || 0,
      setsWon: item.stats?.setsWon || 0,
      currentStreak: item.stats?.currentStreak || 0,
      longestStreak: item.stats?.longestStreak || 0,
    },
    subscription: {
      tier: item.subscription?.tier || 0,
      status: item.subscription?.status || null,
      provider: item.subscription?.provider || null,
      subscriptionId: item.subscription?.subscriptionId || null,
      customerId: item.subscription?.customerId || null,
      startedAt: item.subscription?.startedAt || null,
      expiresAt: item.subscription?.expiresAt || null,
      cancelledAt: item.subscription?.cancelledAt || null,
      giftedBy: item.subscription?.giftedBy || null,
      giftedByName: item.subscription?.giftedByName || null,
      giftedAt: item.subscription?.giftedAt || null,
      giftExpiresAt: item.subscription?.giftExpiresAt || null,
      giftNotificationSeen: item.subscription?.giftNotificationSeen ?? null,
    },
    badges: item.badges || [],
    totalSkillPoints: item.totalSkillPoints || 0,
    tipUnlockedUntil: item.tipUnlockedUntil || null,
  };
}

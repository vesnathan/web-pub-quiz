import { Context, util } from '@aws-appsync/utils';

type Identity = {
  sub?: string;
  groups?: string[];
};

type Args = {
  userId: string;
  tier: number;
};

/**
 * Admin-only mutation to update a user's subscription tier.
 * Used for testing subscription features.
 */
export function request(ctx: Context<Args>) {
  const identity = ctx.identity as Identity | undefined;
  const groups = identity?.groups || [];

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

  const { userId, tier } = ctx.arguments;

  // Validate tier value
  if (tier < 0 || tier > 2) {
    return util.error('Invalid tier: must be 0, 1, or 2', 'ValidationError');
  }

  const now = util.time.nowISO8601();

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    }),
    update: {
      expression: 'SET #sub.#tier = :tier, #sub.#status = :status, #sub.#startedAt = :now, updatedAt = :now',
      expressionNames: {
        '#sub': 'subscription',
        '#tier': 'tier',
        '#status': 'status',
        '#startedAt': 'startedAt',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':tier': tier,
        ':status': tier > 0 ? 'active' : null,
        ':now': now,
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
    },
    badges: item.badges || [],
    totalSkillPoints: item.totalSkillPoints || 0,
    tipUnlockedUntil: item.tipUnlockedUntil || null,
  };
}

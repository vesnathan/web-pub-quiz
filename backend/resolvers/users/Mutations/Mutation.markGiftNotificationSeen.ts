import { Context, util } from '@aws-appsync/utils';

type Identity = {
  sub?: string;
};

/**
 * User mutation to mark their gift notification as seen.
 * Called after user dismisses the gift notification modal.
 */
export function request(ctx: Context) {
  const identity = ctx.identity as Identity | undefined;
  const userId = identity?.sub;

  if (!userId) {
    return util.error('Unauthorized: Must be logged in', 'UnauthorizedException');
  }

  return {
    operation: 'UpdateItem',
    key: util.dynamodb.toMapValues({
      PK: `USER#${userId}`,
      SK: 'PROFILE',
    }),
    update: {
      expression: 'SET #sub.#notificationSeen = :seen, updatedAt = :now',
      expressionNames: {
        '#sub': 'subscription',
        '#notificationSeen': 'giftNotificationSeen',
      },
      expressionValues: util.dynamodb.toMapValues({
        ':seen': true,
        ':now': util.time.nowISO8601(),
      }),
    },
    condition: {
      expression: 'attribute_exists(PK)',
    },
  };
}

export function response(ctx: Context) {
  if (ctx.error) {
    return util.error(ctx.error.message, ctx.error.type);
  }

  // Return true on success
  return true;
}

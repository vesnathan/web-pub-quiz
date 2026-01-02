import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'daily_30',
  name: 'Monthly Master',
  description: 'Play 30 days in a row',
  icon: '📆',
  groupId: 'daily_streak',
  tier: 2,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 30,
  checkCondition: (stats) => (stats.dailyStreak || 0) >= 30,
};

export default badge;

import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'daily_90',
  name: 'Quarterly Queen',
  description: 'Play 90 days in a row',
  icon: '📆',
  groupId: 'daily_streak',
  tier: 3,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 90,
  checkCondition: (stats) => (stats.dailyStreak || 0) >= 90,
};

export default badge;

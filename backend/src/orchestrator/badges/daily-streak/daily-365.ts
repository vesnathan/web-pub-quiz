import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'daily_365',
  name: 'Year-Round Legend',
  description: 'Play 365 days in a row',
  icon: '📆',
  groupId: 'daily_streak',
  tier: 5,
  rarity: 'legendary',
  skillPoints: 250,
  requirement: 365,
  checkCondition: (stats) => (stats.dailyStreak || 0) >= 365,
};

export default badge;

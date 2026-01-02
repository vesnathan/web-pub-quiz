import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'daily_7',
  name: 'Week Warrior',
  description: 'Play 7 days in a row',
  icon: '📆',
  groupId: 'daily_streak',
  tier: 1,
  rarity: 'common',
  skillPoints: 10,
  requirement: 7,
  checkCondition: (stats) => (stats.dailyStreak || 0) >= 7,
};

export default badge;

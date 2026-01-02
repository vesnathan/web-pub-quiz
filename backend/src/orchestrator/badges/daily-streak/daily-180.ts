import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'daily_180',
  name: 'Half Year Hero',
  description: 'Play 180 days in a row',
  icon: '📆',
  groupId: 'daily_streak',
  tier: 4,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 180,
  checkCondition: (stats) => (stats.dailyStreak || 0) >= 180,
};

export default badge;

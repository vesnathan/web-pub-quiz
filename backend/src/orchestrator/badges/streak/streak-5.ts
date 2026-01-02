import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'streak_5',
  name: 'Warming Up',
  description: '5 correct answers in a row',
  icon: '🔥',
  groupId: 'streak',
  tier: 1,
  rarity: 'common',
  skillPoints: 10,
  requirement: 5,
  checkCondition: (stats) => stats.currentStreak >= 5,
};

export default badge;

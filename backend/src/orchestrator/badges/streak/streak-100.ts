import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'streak_100',
  name: 'Legendary Streak',
  description: '100 correct answers in a row',
  icon: '🔥',
  groupId: 'streak',
  tier: 5,
  rarity: 'legendary',
  skillPoints: 250,
  requirement: 100,
  checkCondition: (stats) => stats.currentStreak >= 100,
};

export default badge;

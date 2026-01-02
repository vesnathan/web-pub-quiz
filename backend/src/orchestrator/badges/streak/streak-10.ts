import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'streak_10',
  name: 'On Fire',
  description: '10 correct answers in a row',
  icon: '🔥',
  groupId: 'streak',
  tier: 2,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 10,
  checkCondition: (stats) => stats.currentStreak >= 10,
};

export default badge;

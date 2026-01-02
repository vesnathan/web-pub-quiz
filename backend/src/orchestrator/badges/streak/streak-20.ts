import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'streak_20',
  name: 'Unstoppable',
  description: '20 correct answers in a row',
  icon: '🔥',
  groupId: 'streak',
  tier: 3,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 20,
  checkCondition: (stats) => stats.currentStreak >= 20,
};

export default badge;

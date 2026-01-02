import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'streak_50',
  name: 'Inferno',
  description: '50 correct answers in a row',
  icon: '🔥',
  groupId: 'streak',
  tier: 4,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 50,
  checkCondition: (stats) => stats.currentStreak >= 50,
};

export default badge;

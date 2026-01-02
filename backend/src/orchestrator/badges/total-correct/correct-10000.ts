import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'correct_10000',
  name: 'Mastermind',
  description: '10,000 correct answers',
  icon: '🎯',
  groupId: 'total_correct',
  tier: 5,
  rarity: 'legendary',
  skillPoints: 250,
  requirement: 10000,
  checkCondition: (stats) => stats.totalCorrect >= 10000,
};

export default badge;

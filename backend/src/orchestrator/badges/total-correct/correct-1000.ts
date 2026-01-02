import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'correct_1000',
  name: 'Expert',
  description: '1,000 correct answers',
  icon: '🎯',
  groupId: 'total_correct',
  tier: 3,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 1000,
  checkCondition: (stats) => stats.totalCorrect >= 1000,
};

export default badge;

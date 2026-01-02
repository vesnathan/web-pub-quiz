import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'correct_500',
  name: 'Scholar',
  description: '500 correct answers',
  icon: '🎯',
  groupId: 'total_correct',
  tier: 2,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 500,
  checkCondition: (stats) => stats.totalCorrect >= 500,
};

export default badge;

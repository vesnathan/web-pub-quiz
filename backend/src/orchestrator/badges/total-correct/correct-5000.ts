import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'correct_5000',
  name: 'Genius',
  description: '5,000 correct answers',
  icon: '🎯',
  groupId: 'total_correct',
  tier: 4,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 5000,
  checkCondition: (stats) => stats.totalCorrect >= 5000,
};

export default badge;

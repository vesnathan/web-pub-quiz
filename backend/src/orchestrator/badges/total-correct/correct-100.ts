import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'correct_100',
  name: 'Learner',
  description: '100 correct answers',
  icon: '🎯',
  groupId: 'total_correct',
  tier: 1,
  rarity: 'common',
  skillPoints: 10,
  requirement: 100,
  checkCondition: (stats) => stats.totalCorrect >= 100,
};

export default badge;

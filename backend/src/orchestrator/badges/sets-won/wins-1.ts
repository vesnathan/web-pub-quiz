import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'wins_1',
  name: 'First Victory',
  description: 'Win your first set',
  icon: '🏆',
  groupId: 'sets_won',
  tier: 1,
  rarity: 'common',
  skillPoints: 10,
  requirement: 1,
  checkCondition: (stats) => stats.setsWon >= 1,
};

export default badge;

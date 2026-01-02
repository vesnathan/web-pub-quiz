import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'wins_500',
  name: 'Legend',
  description: 'Win 500 sets',
  icon: '🏆',
  groupId: 'sets_won',
  tier: 5,
  rarity: 'legendary',
  skillPoints: 250,
  requirement: 500,
  checkCondition: (stats) => stats.setsWon >= 500,
};

export default badge;

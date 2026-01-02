import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'wins_10',
  name: 'Winner',
  description: 'Win 10 sets',
  icon: '🏆',
  groupId: 'sets_won',
  tier: 2,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 10,
  checkCondition: (stats) => stats.setsWon >= 10,
};

export default badge;

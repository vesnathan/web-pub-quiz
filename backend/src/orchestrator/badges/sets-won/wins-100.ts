import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'wins_100',
  name: 'Grand Champion',
  description: 'Win 100 sets',
  icon: '🏆',
  groupId: 'sets_won',
  tier: 4,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 100,
  checkCondition: (stats) => stats.setsWon >= 100,
};

export default badge;

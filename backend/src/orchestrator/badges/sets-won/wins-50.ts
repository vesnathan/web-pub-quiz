import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'wins_50',
  name: 'Champion',
  description: 'Win 50 sets',
  icon: '🏆',
  groupId: 'sets_won',
  tier: 3,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 50,
  checkCondition: (stats) => stats.setsWon >= 50,
};

export default badge;

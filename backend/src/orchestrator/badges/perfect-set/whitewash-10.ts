import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'whitewash_10',
  name: 'Perfectionist',
  description: '10 perfect sets',
  icon: '💎',
  groupId: 'perfect_set',
  tier: 3,
  rarity: 'legendary',
  skillPoints: 250,
  requirement: 10,
  checkCondition: (stats) => stats.perfectSets >= 10,
};

export default badge;

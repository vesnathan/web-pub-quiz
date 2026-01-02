import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'whitewash_5',
  name: 'Spotless',
  description: '5 perfect sets',
  icon: '✨',
  groupId: 'perfect_set',
  tier: 2,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 5,
  checkCondition: (stats) => stats.perfectSets >= 5,
};

export default badge;

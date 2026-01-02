import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'whitewash_1',
  name: 'Clean Sweep',
  description: 'Answer all questions correctly in a set',
  icon: '🧹',
  groupId: 'perfect_set',
  tier: 1,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 1,
  checkCondition: (stats) => stats.perfectSets >= 1,
};

export default badge;

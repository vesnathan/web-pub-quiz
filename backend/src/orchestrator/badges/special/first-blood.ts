import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'first_blood',
  name: 'First Blood',
  description: 'First correct answer in a set',
  icon: '🩸',
  groupId: 'special',
  tier: 1,
  rarity: 'common',
  skillPoints: 10,
  requirement: 1,
  checkCondition: (stats, context) =>
    context?.wasFirstBlood || (stats.firstBloodCount || 0) >= 1,
};

export default badge;

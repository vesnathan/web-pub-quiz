import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'comeback_king',
  name: 'Comeback King',
  description: 'Win a set after being last at halftime',
  icon: '👑',
  groupId: 'comeback',
  tier: 1,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 1,
  checkCondition: (stats, context) =>
    context?.wasComeback || (stats.comebackWins || 0) >= 1,
};

export default badge;

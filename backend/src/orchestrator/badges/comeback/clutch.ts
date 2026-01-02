import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'clutch',
  name: 'Clutch Player',
  description: 'Win on the final question',
  icon: '🎰',
  groupId: 'comeback',
  tier: 1,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 1,
  checkCondition: (stats, context) =>
    context?.wasClutch || (stats.clutchWins || 0) >= 1,
};

export default badge;

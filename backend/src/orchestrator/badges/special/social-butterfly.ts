import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'social_butterfly',
  name: 'Social Butterfly',
  description: 'Play with 10 different players',
  icon: '🦋',
  groupId: 'special',
  tier: 1,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 10,
  checkCondition: (stats) => (stats.uniquePlayersPlayedWith || 0) >= 10,
};

export default badge;

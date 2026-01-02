import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'sets_50',
  name: 'Committed',
  description: 'Play 50 sets',
  icon: '📅',
  groupId: 'sets_played',
  tier: 2,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 50,
  checkCondition: (stats) => stats.setsPlayed >= 50,
};

export default badge;

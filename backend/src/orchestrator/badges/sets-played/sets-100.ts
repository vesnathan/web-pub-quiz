import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'sets_100',
  name: 'Devoted',
  description: 'Play 100 sets',
  icon: '📅',
  groupId: 'sets_played',
  tier: 3,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 100,
  checkCondition: (stats) => stats.setsPlayed >= 100,
};

export default badge;

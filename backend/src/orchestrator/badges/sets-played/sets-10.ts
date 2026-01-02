import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'sets_10',
  name: 'Regular',
  description: 'Play 10 sets',
  icon: '📅',
  groupId: 'sets_played',
  tier: 1,
  rarity: 'common',
  skillPoints: 10,
  requirement: 10,
  checkCondition: (stats) => stats.setsPlayed >= 10,
};

export default badge;

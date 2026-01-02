import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'sets_1000',
  name: 'Quiz Master',
  description: 'Play 1000 sets',
  icon: '📅',
  groupId: 'sets_played',
  tier: 5,
  rarity: 'legendary',
  skillPoints: 250,
  requirement: 1000,
  checkCondition: (stats) => stats.setsPlayed >= 1000,
};

export default badge;

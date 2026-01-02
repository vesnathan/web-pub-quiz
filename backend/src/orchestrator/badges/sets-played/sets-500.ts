import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'sets_500',
  name: 'Veteran',
  description: 'Play 500 sets',
  icon: '📅',
  groupId: 'sets_played',
  tier: 4,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 500,
  checkCondition: (stats) => stats.setsPlayed >= 500,
};

export default badge;

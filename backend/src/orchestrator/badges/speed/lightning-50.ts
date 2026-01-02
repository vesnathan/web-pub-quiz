import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'lightning_50',
  name: 'Quicksilver',
  description: 'Fastest buzzer 50 times',
  icon: '⚡',
  groupId: 'speed',
  tier: 3,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 50,
  checkCondition: (stats) => (stats.fastestBuzzerCount || 0) >= 50,
};

export default badge;

import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'lightning_10',
  name: 'Lightning Fast',
  description: 'Fastest buzzer 10 times',
  icon: '⚡',
  groupId: 'speed',
  tier: 2,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 10,
  checkCondition: (stats) => (stats.fastestBuzzerCount || 0) >= 10,
};

export default badge;

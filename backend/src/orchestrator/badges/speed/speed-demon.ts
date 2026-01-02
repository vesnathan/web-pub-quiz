import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'speed_demon',
  name: 'Speed Demon',
  description: 'Fastest average buzzer time in a set',
  icon: '⚡',
  groupId: 'speed',
  tier: 1,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 1,
  checkCondition: (stats) => (stats.fastestBuzzerCount || 0) >= 1,
};

export default badge;

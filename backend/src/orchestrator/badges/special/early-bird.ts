import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'early_bird',
  name: 'Early Bird',
  description: 'Play a set before 6 AM',
  icon: '🌅',
  groupId: 'special',
  tier: 1,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 1,
  checkCondition: (stats, context) =>
    context?.currentHour !== undefined
      ? context.currentHour < 6
      : (stats.earlyBirdSets || 0) >= 1,
};

export default badge;

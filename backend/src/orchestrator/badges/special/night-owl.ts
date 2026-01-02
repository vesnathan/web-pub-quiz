import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'night_owl',
  name: 'Night Owl',
  description: 'Play a set after midnight',
  icon: '🦉',
  groupId: 'special',
  tier: 1,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 1,
  checkCondition: (stats, context) =>
    context?.currentHour !== undefined
      ? context.currentHour >= 0 && context.currentHour < 4
      : (stats.nightOwlSets || 0) >= 1,
};

export default badge;

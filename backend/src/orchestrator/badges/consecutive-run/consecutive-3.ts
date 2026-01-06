import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'consecutive_3',
  name: 'Hat Trick',
  description: 'Answer 3 consecutive questions correctly in a set',
  icon: '🎩',
  groupId: 'consecutive-run',
  tier: 1,
  rarity: 'common',
  skillPoints: 10,
  requirement: 3,
  checkCondition: (_stats, context) => (context?.consecutiveRunThisSet || 0) >= 3,
};

export default badge;

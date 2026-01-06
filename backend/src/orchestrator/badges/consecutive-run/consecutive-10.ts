import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'consecutive_10',
  name: 'Dominator',
  description: 'Answer 10 consecutive questions correctly in a set',
  icon: '👑',
  groupId: 'consecutive-run',
  tier: 4,
  rarity: 'epic',
  skillPoints: 100,
  requirement: 10,
  checkCondition: (_stats, context) => (context?.consecutiveRunThisSet || 0) >= 10,
};

export default badge;

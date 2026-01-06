import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'consecutive_5',
  name: 'High Five',
  description: 'Answer 5 consecutive questions correctly in a set',
  icon: '🖐️',
  groupId: 'consecutive-run',
  tier: 2,
  rarity: 'uncommon',
  skillPoints: 25,
  requirement: 5,
  checkCondition: (_stats, context) => (context?.consecutiveRunThisSet || 0) >= 5,
};

export default badge;

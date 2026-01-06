import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'consecutive_7',
  name: 'Lucky Seven',
  description: 'Answer 7 consecutive questions correctly in a set',
  icon: '🎰',
  groupId: 'consecutive-run',
  tier: 3,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 7,
  checkCondition: (_stats, context) => (context?.consecutiveRunThisSet || 0) >= 7,
};

export default badge;

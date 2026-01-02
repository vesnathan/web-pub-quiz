import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'master_history',
  name: 'History Buff',
  description: '90% accuracy in History (min 50 questions)',
  icon: '📜',
  groupId: 'category_mastery',
  tier: 1,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 50,
  checkCondition: (stats) => {
    const data = stats.categoryStats?.['history'];
    if (!data || data.total < 50) return false;
    return data.correct / data.total >= 0.9;
  },
};

export default badge;

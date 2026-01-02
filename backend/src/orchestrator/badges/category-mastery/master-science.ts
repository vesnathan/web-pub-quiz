import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'master_science',
  name: 'Science Whiz',
  description: '90% accuracy in Science (min 50 questions)',
  icon: '🔬',
  groupId: 'category_mastery',
  tier: 1,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 50,
  checkCondition: (stats) => {
    const data = stats.categoryStats?.['science'];
    if (!data || data.total < 50) return false;
    return data.correct / data.total >= 0.9;
  },
};

export default badge;

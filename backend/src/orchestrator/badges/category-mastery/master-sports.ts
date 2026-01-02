import type { BadgeDefinition } from '../types';

const badge: BadgeDefinition = {
  id: 'master_sports',
  name: 'Sports Fanatic',
  description: '90% accuracy in Sports (min 50 questions)',
  icon: '⚽',
  groupId: 'category_mastery',
  tier: 1,
  rarity: 'rare',
  skillPoints: 50,
  requirement: 50,
  checkCondition: (stats) => {
    const data = stats.categoryStats?.['sports'];
    if (!data || data.total < 50) return false;
    return data.correct / data.total >= 0.9;
  },
};

export default badge;

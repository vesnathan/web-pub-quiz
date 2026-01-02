import masterScience from './master-science';
import masterHistory from './master-history';
import masterGeography from './master-geography';
import masterSports from './master-sports';
import masterEntertainment from './master-entertainment';
import masterArts from './master-arts';

export const categoryMasteryBadges = [
  masterScience,
  masterHistory,
  masterGeography,
  masterSports,
  masterEntertainment,
  masterArts,
];

export const CATEGORY_MASTERY_GROUP = {
  id: 'category_mastery',
  name: 'Category Master',
  description: 'Excel in specific categories',
  showHighestOnly: false, // Show all category badges
};

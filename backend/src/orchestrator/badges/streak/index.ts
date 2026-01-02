import streak5 from './streak-5';
import streak10 from './streak-10';
import streak20 from './streak-20';
import streak50 from './streak-50';
import streak100 from './streak-100';

export const streakBadges = [streak5, streak10, streak20, streak50, streak100];

export const STREAK_GROUP = {
  id: 'streak',
  name: 'Hot Streak',
  description: 'Correct answers in a row',
  showHighestOnly: true,
};

import daily7 from './daily-7';
import daily30 from './daily-30';
import daily90 from './daily-90';
import daily180 from './daily-180';
import daily365 from './daily-365';

export const dailyStreakBadges = [daily7, daily30, daily90, daily180, daily365];

export const DAILY_STREAK_GROUP = {
  id: 'daily_streak',
  name: 'Daily Player',
  description: 'Consecutive days played',
  showHighestOnly: true,
};

import consecutive3 from './consecutive-3';
import consecutive5 from './consecutive-5';
import consecutive7 from './consecutive-7';
import consecutive10 from './consecutive-10';

export const consecutiveRunBadges = [consecutive3, consecutive5, consecutive7, consecutive10];

export const CONSECUTIVE_RUN_GROUP = {
  id: 'consecutive-run',
  name: 'Question Streak',
  description: 'Answer consecutive questions correctly in a set',
  showHighestOnly: true,
};

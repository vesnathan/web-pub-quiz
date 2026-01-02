import speedDemon from './speed-demon';
import lightning10 from './lightning-10';
import lightning50 from './lightning-50';

export const speedBadges = [speedDemon, lightning10, lightning50];

export const SPEED_GROUP = {
  id: 'speed',
  name: 'Speed Demon',
  description: 'Fastest buzzer in a set',
  showHighestOnly: false, // Can show multiple speed achievements
};

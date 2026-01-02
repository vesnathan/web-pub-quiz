import earlyBird from './early-bird';
import nightOwl from './night-owl';
import firstBlood from './first-blood';
import socialButterfly from './social-butterfly';

export const specialBadges = [earlyBird, nightOwl, firstBlood, socialButterfly];

export const SPECIAL_GROUP = {
  id: 'special',
  name: 'Special',
  description: 'Unique achievements',
  showHighestOnly: false, // Show all special badges
};

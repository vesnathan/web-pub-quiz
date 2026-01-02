/**
 * Badge Registry
 *
 * All badges are organized into groups. Each group has:
 * - A unique ID
 * - A display name and description
 * - showHighestOnly flag: if true, only show the highest tier badge earned
 * - An array of badge definitions
 */

import type { BadgeDefinition, UserStats, BadgeCheckContext } from './types';
export type { BadgeDefinition, UserStats, BadgeCheckContext };

// Import all badge groups
import { streakBadges, STREAK_GROUP } from './streak';
import { perfectSetBadges, PERFECT_SET_GROUP } from './perfect-set';
import { setsPlayedBadges, SETS_PLAYED_GROUP } from './sets-played';
import { setsWonBadges, SETS_WON_GROUP } from './sets-won';
import { speedBadges, SPEED_GROUP } from './speed';
import { totalCorrectBadges, TOTAL_CORRECT_GROUP } from './total-correct';
import { dailyStreakBadges, DAILY_STREAK_GROUP } from './daily-streak';
import { comebackBadges, COMEBACK_GROUP } from './comeback';
import { specialBadges, SPECIAL_GROUP } from './special';
import { categoryMasteryBadges, CATEGORY_MASTERY_GROUP } from './category-mastery';

// Badge group definition
export interface BadgeGroup {
  id: string;
  name: string;
  description: string;
  showHighestOnly: boolean;
  badges: BadgeDefinition[];
}

// All badge groups
export const BADGE_GROUPS: BadgeGroup[] = [
  { ...STREAK_GROUP, badges: streakBadges },
  { ...PERFECT_SET_GROUP, badges: perfectSetBadges },
  { ...SETS_PLAYED_GROUP, badges: setsPlayedBadges },
  { ...SETS_WON_GROUP, badges: setsWonBadges },
  { ...SPEED_GROUP, badges: speedBadges },
  { ...TOTAL_CORRECT_GROUP, badges: totalCorrectBadges },
  { ...DAILY_STREAK_GROUP, badges: dailyStreakBadges },
  { ...COMEBACK_GROUP, badges: comebackBadges },
  { ...SPECIAL_GROUP, badges: specialBadges },
  { ...CATEGORY_MASTERY_GROUP, badges: categoryMasteryBadges },
];

// All badges flattened (for backward compatibility)
export const allBadges: BadgeDefinition[] = BADGE_GROUPS.flatMap(
  (group) => group.badges
);

/**
 * Check all badges and return the ones that should be awarded
 */
export function getEarnedBadges(
  stats: UserStats,
  context?: BadgeCheckContext
): BadgeDefinition[] {
  return allBadges.filter((badge) => badge.checkCondition(stats, context));
}

/**
 * Get a specific badge by ID
 */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return allBadges.find((badge) => badge.id === id);
}

/**
 * Get a specific badge group by ID
 */
export function getGroupById(id: string): BadgeGroup | undefined {
  return BADGE_GROUPS.find((group) => group.id === id);
}

/**
 * Get the highest tier badge earned in a group
 */
export function getHighestBadgeInGroup(
  groupId: string,
  earnedBadgeIds: string[]
): BadgeDefinition | undefined {
  const group = getGroupById(groupId);
  if (!group) return undefined;

  const earnedInGroup = group.badges
    .filter((badge) => earnedBadgeIds.includes(badge.id))
    .sort((a, b) => b.tier - a.tier);

  return earnedInGroup[0];
}

/**
 * Get badges to display (respecting showHighestOnly per group)
 */
export function getBadgesToDisplay(
  earnedBadgeIds: string[]
): BadgeDefinition[] {
  const displayBadges: BadgeDefinition[] = [];

  for (const group of BADGE_GROUPS) {
    if (group.showHighestOnly) {
      const highest = getHighestBadgeInGroup(group.id, earnedBadgeIds);
      if (highest) {
        displayBadges.push(highest);
      }
    } else {
      const earnedInGroup = group.badges.filter((badge) =>
        earnedBadgeIds.includes(badge.id)
      );
      displayBadges.push(...earnedInGroup);
    }
  }

  return displayBadges;
}

/**
 * Calculate total skill points from earned badges
 */
export function calculateTotalSkillPoints(earnedBadgeIds: string[]): number {
  return earnedBadgeIds.reduce((total, badgeId) => {
    const badge = getBadgeById(badgeId);
    return total + (badge?.skillPoints || 0);
  }, 0);
}

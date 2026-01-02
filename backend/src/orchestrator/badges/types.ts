/**
 * Badge system types
 * Extended to support the comprehensive award system
 */

import type { AwardRarity } from '@quiz/shared';

export type { AwardRarity };

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Badge group ID for grouping related badges */
  groupId: string;
  /** Tier within the group (1 = lowest, higher = better) */
  tier: number;
  /** Rarity determines skill points and display styling */
  rarity: AwardRarity;
  /** Skill points awarded for this badge */
  skillPoints: number;
  /** The requirement threshold to earn this badge */
  requirement: number;
  /** Check if the badge should be awarded based on user stats */
  checkCondition: (stats: UserStats, context?: BadgeCheckContext) => boolean;
}

export interface UserStats {
  // Core stats
  totalCorrect: number;
  totalWrong: number;
  totalPoints: number;
  currentStreak: number;
  longestStreak: number;
  setsPlayed: number;
  setsWon: number;
  perfectSets: number;

  // Speed tracking (for speed badges)
  fastestBuzzerCount?: number;

  // Daily streak tracking
  dailyStreak?: number;
  lastPlayedDate?: string;

  // Category stats (for category mastery badges)
  categoryStats?: Record<
    string,
    {
      correct: number;
      total: number;
    }
  >;

  // Unique players played with (for social butterfly)
  uniquePlayersPlayedWith?: number;

  // Comeback tracking
  comebackWins?: number;
  clutchWins?: number;

  // Time-based tracking
  earlyBirdSets?: number;
  nightOwlSets?: number;
  firstBloodCount?: number;
}

/** Badge check context - additional context beyond stats */
export interface BadgeCheckContext {
  setId?: string;
  wasFirstBlood?: boolean;
  wasComeback?: boolean;
  wasClutch?: boolean;
  wasFastestBuzzer?: boolean;
  currentHour?: number;
}

/** Skill points by rarity */
export const SKILL_POINTS_BY_RARITY: Record<AwardRarity, number> = {
  common: 10,
  uncommon: 25,
  rare: 50,
  epic: 100,
  legendary: 250,
};

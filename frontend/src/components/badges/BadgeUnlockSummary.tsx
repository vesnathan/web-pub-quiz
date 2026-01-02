"use client";

import { motion } from "framer-motion";
import type { AwardBadge } from "@quiz/shared";
import {
  getRarityGradient,
  getRarityColor,
  calculateTotalSkillPoints,
} from "@quiz/shared";

interface BadgeUnlockSummaryProps {
  badges: AwardBadge[];
  totalSkillPointsEarned: number;
}

function BadgeCard({ badge, index }: { badge: AwardBadge; index: number }) {
  const rarityGradient = getRarityGradient(badge.rarity);
  const rarityColor = getRarityColor(badge.rarity);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{
        delay: 0.2 + index * 0.15,
        duration: 0.4,
        ease: "easeOut",
      }}
      className={`relative flex flex-col items-center p-1 rounded-xl bg-gradient-to-br ${rarityGradient}`}
    >
      <div className="flex flex-col items-center w-full h-full rounded-lg bg-gray-800 p-4">
        {/* Icon with glow */}
        <div className="relative">
          <motion.div
            className={`absolute inset-0 rounded-full bg-gradient-to-r ${rarityGradient} blur-md opacity-50`}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <span className="relative text-4xl">{badge.icon}</span>
        </div>

        {/* Name */}
        <h4 className="text-white font-bold text-center mt-2 leading-tight">
          {badge.name}
        </h4>

        {/* Description */}
        <p className="text-gray-400 text-xs text-center mt-1 leading-tight">
          {badge.description}
        </p>

        {/* Rarity & Points */}
        <div className="flex items-center gap-2 mt-2">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: rarityColor }}
          >
            {badge.rarity}
          </span>
          <span className="text-yellow-400 text-xs font-bold">
            +{badge.skillPoints} SP
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function BadgeUnlockSummary({
  badges,
  totalSkillPointsEarned,
}: BadgeUnlockSummaryProps) {
  if (badges.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="text-center mb-6"
      >
        <h3 className="text-2xl font-bold text-white mb-1">Congratulations!</h3>
        <p className="text-gray-400">
          You earned {badges.length} badge{badges.length > 1 ? "s" : ""} this
          set
        </p>
      </motion.div>

      {/* Badges grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {badges.map((badge, index) => (
          <BadgeCard key={badge.id} badge={badge} index={index} />
        ))}
      </div>

      {/* Total skill points */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 + badges.length * 0.15, duration: 0.4 }}
        className="text-center p-4 rounded-lg bg-gray-800/50 border border-yellow-500/30"
      >
        <div className="text-gray-400 text-sm mb-1">
          Total Skill Points Earned
        </div>
        <div className="text-3xl font-bold text-yellow-400">
          +{totalSkillPointsEarned} SP
        </div>
      </motion.div>
    </motion.div>
  );
}

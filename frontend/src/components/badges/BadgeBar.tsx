"use client";

import { motion } from "framer-motion";
import { Tooltip } from "@nextui-org/react";
import type { AwardBadge } from "@quiz/shared";
import { getBadgeById, getRarityColor } from "@quiz/shared";

interface BadgeBarProps {
  badgeIds: string[];
  title?: string;
}

export function BadgeBar({ badgeIds, title = "Badges Earned" }: BadgeBarProps) {
  // Convert badge IDs to full badge objects
  const badges: AwardBadge[] = badgeIds
    .map((id) => getBadgeById(id))
    .filter((badge): badge is AwardBadge => badge !== undefined);

  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 rounded-lg border border-purple-500/30 p-3">
      <div className="text-xs text-purple-300 mb-2 font-semibold text-center">
        {title}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {badges.map((badge, index) => (
          <Tooltip
            key={`${badge.id}-${index}`}
            content={
              <div className="p-2 max-w-xs">
                <div className="font-bold text-white">{badge.name}</div>
                <div className="text-xs text-gray-300">{badge.description}</div>
                <div
                  className="text-xs mt-1 font-semibold"
                  style={{ color: getRarityColor(badge.rarity) }}
                >
                  {badge.rarity.toUpperCase()} (+{badge.skillPoints} SP)
                </div>
              </div>
            }
            placement="top"
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: index * 0.1,
                type: "spring",
                stiffness: 300,
              }}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl cursor-pointer hover:scale-110 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${getRarityColor(badge.rarity)}40, ${getRarityColor(badge.rarity)}20)`,
                border: `2px solid ${getRarityColor(badge.rarity)}60`,
              }}
            >
              {badge.icon}
            </motion.div>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AwardBadge } from "@quiz/shared";
import { getRarityGradient, getRarityColor } from "@quiz/shared";

interface BadgeAwardAnimationProps {
  badge: AwardBadge | null;
  onComplete: () => void;
  targetPosition?: { x: number; y: number }; // where the badge flies to (username position)
}

// Sparkle component for the explosion effect
function Sparkle({
  delay,
  angle,
  distance,
}: {
  delay: number;
  angle: number;
  distance: number;
}) {
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-yellow-300"
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{
        opacity: [1, 1, 0],
        scale: [1, 0.5, 0],
        x: [0, x * 0.5, x],
        y: [0, y * 0.5, y],
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// Star burst effect
function StarBurst() {
  const sparkles = [];
  const numSparkles = 12;

  for (let i = 0; i < numSparkles; i++) {
    const angle = (i / numSparkles) * Math.PI * 2;
    const distance = 80 + Math.random() * 40;
    sparkles.push(
      <Sparkle key={i} delay={i * 0.02} angle={angle} distance={distance} />,
    );
  }

  // Add some random sparkles
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 60 + Math.random() * 60;
    sparkles.push(
      <Sparkle
        key={`r${i}`}
        delay={0.1 + i * 0.03}
        angle={angle}
        distance={distance}
      />,
    );
  }

  return <>{sparkles}</>;
}

export function BadgeAwardAnimation({
  badge,
  onComplete,
  targetPosition,
}: BadgeAwardAnimationProps) {
  const [phase, setPhase] = useState<"explode" | "fly" | "done">("explode");

  useEffect(() => {
    if (!badge) return;

    // Phase 1: Explosion (1.2s)
    const flyTimer = setTimeout(() => {
      setPhase("fly");
    }, 1200);

    // Phase 2: Fly to target (0.8s)
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 2000);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(doneTimer);
    };
  }, [badge, onComplete]);

  if (!badge) return null;

  const rarityGradient = getRarityGradient(badge.rarity);
  const rarityColor = getRarityColor(badge.rarity);

  // Default target is top-right corner if not specified
  const target = targetPosition || { x: window.innerWidth - 100, y: 60 };
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Dark overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === "explode" ? 0.5 : 0 }}
            transition={{ duration: 0.3 }}
          />

          {/* Badge container */}
          <motion.div
            className="absolute"
            initial={{
              left: centerX,
              top: centerY,
              x: "-50%",
              y: "-50%",
            }}
            animate={
              phase === "fly"
                ? {
                    left: target.x,
                    top: target.y,
                    x: "-50%",
                    y: "-50%",
                    scale: 0.3,
                  }
                : {}
            }
            transition={{
              duration: 0.8,
              ease: [0.32, 0, 0.67, 0],
            }}
          >
            {/* Sparkles */}
            {phase === "explode" && (
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <StarBurst />
              </div>
            )}

            {/* Glow effect */}
            <motion.div
              className={`absolute inset-0 rounded-full bg-gradient-to-r ${rarityGradient} blur-xl`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: phase === "explode" ? [0, 0.8, 0.4] : 0,
                scale: phase === "explode" ? [0.5, 1.5, 1.2] : 1,
              }}
              transition={{ duration: 0.6 }}
              style={{
                width: 200,
                height: 200,
                marginLeft: -100,
                marginTop: -100,
              }}
            />

            {/* Badge */}
            <motion.div
              className={`relative flex flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${rarityGradient} p-1`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{
                scale: phase === "explode" ? [0, 1.2, 1] : 1,
                rotate: phase === "explode" ? [-180, 10, 0] : 0,
              }}
              transition={{
                duration: 0.6,
                ease: "easeOut",
              }}
              style={{ width: 160, height: 180 }}
            >
              <div className="flex flex-col items-center justify-center w-full h-full rounded-xl bg-gray-900 p-4">
                {/* Icon */}
                <motion.div
                  className="text-6xl mb-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  {badge.icon}
                </motion.div>

                {/* Name */}
                <motion.div
                  className="text-white font-bold text-center text-lg leading-tight"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                >
                  {badge.name}
                </motion.div>

                {/* Rarity */}
                <motion.div
                  className="text-xs font-semibold uppercase tracking-wider mt-1"
                  style={{ color: rarityColor }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.3 }}
                >
                  {badge.rarity}
                </motion.div>

                {/* Skill points */}
                <motion.div
                  className="text-yellow-400 text-sm font-bold mt-2"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.3 }}
                >
                  +{badge.skillPoints} SP
                </motion.div>
              </div>
            </motion.div>

            {/* "Badge Unlocked" text */}
            {phase === "explode" && (
              <motion.div
                className="absolute -top-16 left-1/2 -translate-x-1/2 whitespace-nowrap"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              >
                <span className="text-2xl font-bold text-white drop-shadow-lg">
                  Badge Unlocked!
                </span>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip } from "@nextui-org/react";
import type { AwardBadge } from "@quiz/shared";
import { getRarityGradient, getRarityColor } from "@quiz/shared";

export interface BadgeWithCount {
  badge: AwardBadge;
  count: number;
}

interface BadgeRevolverProps {
  badges: AwardBadge[];
  onAllBadgesShown?: () => void;
  /** Delay in ms before starting badge animations (default: 1500ms) */
  startDelay?: number;
}

// Helper function to count and deduplicate badges
function countBadges(badges: AwardBadge[]): BadgeWithCount[] {
  const countMap = new Map<string, { badge: AwardBadge; count: number }>();

  for (const badge of badges) {
    const existing = countMap.get(badge.id);
    if (existing) {
      existing.count++;
    } else {
      countMap.set(badge.id, { badge, count: 1 });
    }
  }

  return Array.from(countMap.values());
}

// Sparkle component for the explosion effect
function Sparkle({
  delay,
  angle,
  distance,
  color = "bg-yellow-300",
  size = "w-2 h-2",
  duration = 0.8,
}: {
  delay: number;
  angle: number;
  distance: number;
  color?: string;
  size?: string;
  duration?: number;
}) {
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;

  return (
    <motion.div
      className={`absolute ${size} rounded-full ${color}`}
      initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      animate={{
        opacity: [1, 1, 0],
        scale: [1, 1.5, 0],
        x: [0, x * 0.6, x],
        y: [0, y * 0.6, y],
      }}
      transition={{
        duration,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// Confetti piece for celebration effect
function ConfettiPiece({
  delay,
  startX,
  startY,
  color,
}: {
  delay: number;
  startX: number;
  startY: number;
  color: string;
}) {
  const endX = startX + (Math.random() - 0.5) * 200;
  const endY = startY + Math.random() * 150 + 50;
  const rotation = Math.random() * 720 - 360;

  return (
    <motion.div
      className={`absolute w-2 h-3 ${color}`}
      style={{
        left: "50%",
        top: "50%",
        borderRadius: Math.random() > 0.5 ? "50%" : "2px",
      }}
      initial={{ opacity: 1, x: startX, y: startY, rotate: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0],
        x: endX,
        y: endY,
        rotate: rotation,
        scale: [1, 1, 0.5],
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// Ring pulse effect
function RingPulse({ delay, color }: { delay: number; color: string }) {
  return (
    <motion.div
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 ${color}`}
      initial={{ width: 0, height: 0, opacity: 1 }}
      animate={{
        width: [0, 200, 300],
        height: [0, 200, 300],
        opacity: [1, 0.6, 0],
      }}
      transition={{
        duration: 0.8,
        delay,
        ease: "easeOut",
      }}
    />
  );
}

// Star burst effect for badge unlock - enhanced with more particles
function StarBurst({ rarity }: { rarity?: string }) {
  const sparkles = [];
  const confetti = [];

  // Get rarity-based colors
  const colors = {
    common: ["bg-gray-300", "bg-gray-400", "bg-white"],
    uncommon: ["bg-green-300", "bg-green-400", "bg-emerald-300"],
    rare: ["bg-blue-300", "bg-blue-400", "bg-cyan-300"],
    epic: ["bg-purple-300", "bg-purple-400", "bg-fuchsia-300"],
    legendary: ["bg-yellow-300", "bg-orange-300", "bg-amber-300"],
  };

  const particleColors =
    colors[rarity as keyof typeof colors] || colors.legendary;

  // Inner ring of sparkles - fast and close
  const innerSparkles = 12;
  for (let i = 0; i < innerSparkles; i++) {
    const angle = (i / innerSparkles) * Math.PI * 2;
    const distance = 60 + Math.random() * 20;
    sparkles.push(
      <Sparkle
        key={`inner-${i}`}
        delay={i * 0.015}
        angle={angle}
        distance={distance}
        color={particleColors[i % particleColors.length]}
        size="w-2 h-2"
        duration={0.6}
      />,
    );
  }

  // Outer ring of sparkles - slower and farther
  const outerSparkles = 16;
  for (let i = 0; i < outerSparkles; i++) {
    const angle = (i / outerSparkles) * Math.PI * 2 + Math.PI / 16;
    const distance = 100 + Math.random() * 40;
    sparkles.push(
      <Sparkle
        key={`outer-${i}`}
        delay={0.05 + i * 0.02}
        angle={angle}
        distance={distance}
        color={particleColors[i % particleColors.length]}
        size="w-1.5 h-1.5"
        duration={0.9}
      />,
    );
  }

  // Random sparkles for extra chaos
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 80;
    sparkles.push(
      <Sparkle
        key={`random-${i}`}
        delay={0.1 + Math.random() * 0.15}
        angle={angle}
        distance={distance}
        color="bg-white"
        size="w-1 h-1"
        duration={0.7}
      />,
    );
  }

  // Confetti pieces
  const confettiColors = [
    "bg-yellow-400",
    "bg-pink-400",
    "bg-cyan-400",
    "bg-green-400",
    "bg-purple-400",
    "bg-orange-400",
  ];
  for (let i = 0; i < 20; i++) {
    const startX = (Math.random() - 0.5) * 60;
    const startY = (Math.random() - 0.5) * 60 - 20;
    confetti.push(
      <ConfettiPiece
        key={`confetti-${i}`}
        delay={0.1 + i * 0.02}
        startX={startX}
        startY={startY}
        color={confettiColors[i % confettiColors.length]}
      />,
    );
  }

  return (
    <>
      {sparkles}
      {confetti}
    </>
  );
}

// Screen flash effect
function ScreenFlash() {
  return (
    <motion.div
      className="absolute inset-0 bg-white pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.4, 0] }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    />
  );
}

// Settled badge component - shown in the badge bar after animation
function SettledBadge({ badge, count }: { badge: AwardBadge; count: number }) {
  const rarityGradient = getRarityGradient(badge.rarity);
  const rarityColor = getRarityColor(badge.rarity);

  return (
    <Tooltip
      content={
        <div className="px-2 py-1 max-w-[200px]">
          <div className="font-bold text-white">{badge.name}</div>
          <div className="text-xs text-gray-300">{badge.description}</div>
        </div>
      }
      placement="top"
      delay={200}
      closeDelay={0}
      classNames={{
        content: "bg-gray-800 border border-gray-600",
      }}
    >
      <motion.div
        className={`relative flex flex-col items-center justify-center rounded-lg bg-gradient-to-br ${rarityGradient} p-0.5 cursor-pointer`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
        style={{ width: 56, height: 64 }}
      >
        <div className="flex flex-col items-center justify-center w-full h-full rounded-md bg-gray-900 p-1">
          <span className="text-xl">{badge.icon}</span>
          <span
            className="text-[8px] font-semibold uppercase tracking-wider mt-0.5"
            style={{ color: rarityColor }}
          >
            {badge.rarity}
          </span>
        </div>
        {/* Count badge for repeatable badges */}
        {count > 1 && (
          <div className="absolute -bottom-1 -right-1 bg-primary-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg border-2 border-gray-900">
            x{count}
          </div>
        )}
      </motion.div>
    </Tooltip>
  );
}

// Animating badge - shows center explosion then flies to target
function AnimatingBadge({
  badge,
  count,
  onAnimationComplete,
  targetRef,
}: {
  badge: AwardBadge;
  count: number;
  onAnimationComplete: () => void;
  targetRef: React.RefObject<HTMLDivElement | null>;
}) {
  const rarityGradient = getRarityGradient(badge.rarity);
  const rarityColor = getRarityColor(badge.rarity);
  const [phase, setPhase] = useState<"center" | "flying">("center");
  const [targetPosition, setTargetPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Memoize the completion handler to avoid dependency issues
  const handleComplete = useCallback(() => {
    onAnimationComplete();
  }, [onAnimationComplete]);

  // Calculate target position when entering flying phase
  useEffect(() => {
    if (phase === "flying" && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setTargetPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, [phase, targetRef]);

  useEffect(() => {
    // Phase 1: Show in center with explosion (1.8s for more fanfare)
    const flyTimer = setTimeout(() => {
      setPhase("flying");
    }, 1800);

    // Phase 2: Fly to position (0.6s) then complete
    const completeTimer = setTimeout(() => {
      handleComplete();
    }, 2400);

    return () => {
      clearTimeout(flyTimer);
      clearTimeout(completeTimer);
    };
  }, [handleComplete]);

  // Get rarity-specific border color for ring pulse
  const ringBorderColor =
    {
      common: "border-gray-400",
      uncommon: "border-green-400",
      rare: "border-blue-400",
      epic: "border-purple-400",
      legendary: "border-yellow-400",
    }[badge.rarity] || "border-yellow-400";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Screen flash on badge appear */}
        {phase === "center" && <ScreenFlash />}

        {/* Dark overlay - only during center phase */}
        <AnimatePresence>
          {phase === "center" && (
            <motion.div
              className="absolute inset-0 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Badge container - centered via flexbox, then flies to target */}
        {phase === "center" ? (
          // Center phase: use flexbox centering
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Ring pulse effects */}
            <div className="absolute">
              <RingPulse delay={0} color={ringBorderColor} />
              <RingPulse delay={0.15} color={ringBorderColor} />
              <RingPulse delay={0.3} color="border-white/50" />
            </div>

            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 180,
                damping: 12,
              }}
            >
              {/* Sparkles and confetti */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                <StarBurst rarity={badge.rarity} />
              </div>

              {/* Pulsing glow effect */}
              <motion.div
                className={`absolute rounded-full bg-gradient-to-r ${rarityGradient} blur-2xl`}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{
                  opacity: [0, 0.9, 0.6, 0.8, 0.5],
                  scale: [0.5, 1.5, 1.2, 1.4, 1],
                }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  width: 180,
                  height: 180,
                  left: "50%",
                  top: "50%",
                  marginLeft: -90,
                  marginTop: -90,
                }}
              />

              {/* Secondary glow layer */}
              <motion.div
                className="absolute rounded-full bg-white blur-xl"
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{
                  opacity: [0, 0.5, 0],
                  scale: [0.3, 1.8, 2],
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                style={{
                  width: 120,
                  height: 120,
                  left: "50%",
                  top: "50%",
                  marginLeft: -60,
                  marginTop: -60,
                }}
              />

              {/* Badge card with bounce effect */}
              <motion.div
                className={`relative flex flex-col items-center justify-center rounded-xl bg-gradient-to-br ${rarityGradient} p-1 shadow-2xl`}
                style={{ width: 120, height: 130 }}
                animate={{
                  scale: [1, 1.05, 1, 1.03, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: 0,
                  ease: "easeInOut",
                }}
              >
                <div className="flex flex-col items-center justify-center w-full h-full rounded-lg bg-gray-900 p-3">
                  <motion.div
                    className="text-5xl"
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{
                      scale: [0, 1.4, 0.9, 1.1, 1],
                      rotate: [0, 10, -5, 3, 0],
                    }}
                    transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
                  >
                    {badge.icon}
                  </motion.div>
                  <motion.div
                    className="text-white font-bold text-center text-base leading-tight mt-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.25 }}
                  >
                    {badge.name}
                  </motion.div>
                  <motion.div
                    className="text-sm font-bold uppercase tracking-wider mt-1"
                    style={{ color: rarityColor }}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, duration: 0.2 }}
                  >
                    {badge.rarity}
                  </motion.div>
                  {/* Skill points earned */}
                  <motion.div
                    className="text-yellow-400 text-sm font-bold mt-1"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.2 }}
                  >
                    +{badge.skillPoints} SP
                  </motion.div>
                </div>
              </motion.div>

              {/* "Badge Unlocked" text with glow */}
              <motion.div
                className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap"
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.3, type: "spring" }}
              >
                <span
                  className="text-2xl font-bold text-white drop-shadow-lg"
                  style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}
                >
                  🎉 Badge Unlocked!{count > 1 && ` x${count}`} 🎉
                </span>
              </motion.div>

              {/* Skill points indicator below */}
              <motion.div
                className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                <span className="text-lg font-semibold text-purple-300">
                  +{badge.skillPoints * count} Skill Points
                </span>
              </motion.div>
            </motion.div>
          </div>
        ) : (
          // Flying phase: animate to target position
          targetPosition && (
            <motion.div
              className="absolute"
              initial={{
                left: "50%",
                top: "50%",
                x: "-50%",
                y: "-50%",
                scale: 1,
              }}
              animate={{
                left: targetPosition.x,
                top: targetPosition.y,
                x: "-50%",
                y: "-50%",
                scale: 0.48,
              }}
              transition={{
                duration: 0.5,
                ease: [0.32, 0, 0.67, 0],
              }}
            >
              {/* Trailing particles during flight */}
              <motion.div
                className={`absolute rounded-full bg-gradient-to-r ${rarityGradient} blur-md`}
                initial={{ opacity: 0.8, scale: 1 }}
                animate={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.4 }}
                style={{
                  width: 60,
                  height: 60,
                  left: "50%",
                  top: "50%",
                  marginLeft: -30,
                  marginTop: -30,
                }}
              />

              {/* Badge card for flying phase */}
              <div
                className={`relative flex flex-col items-center justify-center rounded-xl bg-gradient-to-br ${rarityGradient} p-1`}
                style={{ width: 120, height: 130 }}
              >
                <div className="flex flex-col items-center justify-center w-full h-full rounded-lg bg-gray-900 p-3">
                  <div className="text-5xl">{badge.icon}</div>
                  <div className="text-white font-bold text-center text-base leading-tight mt-2">
                    {badge.name}
                  </div>
                  <div
                    className="text-sm font-bold uppercase tracking-wider mt-1"
                    style={{ color: rarityColor }}
                  >
                    {badge.rarity}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export function BadgeRevolver({
  badges,
  onAllBadgesShown,
  startDelay = 1500,
}: BadgeRevolverProps) {
  // Count and deduplicate badges
  const countedBadges = countBadges(badges);

  const [isReady, setIsReady] = useState(false);
  const [currentAnimatingIndex, setCurrentAnimatingIndex] = useState(-1);
  const [shownBadges, setShownBadges] = useState<BadgeWithCount[]>([]);
  const animationStarted = useRef(false);
  const targetRef = useRef<HTMLDivElement>(null);

  // Wait for start delay before beginning animations
  useEffect(() => {
    if (countedBadges.length === 0) return;

    const timer = setTimeout(() => {
      setIsReady(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [countedBadges.length, startDelay]);

  // Start animations once ready
  useEffect(() => {
    if (!isReady || countedBadges.length === 0 || animationStarted.current)
      return;
    animationStarted.current = true;

    // Start showing badges one by one
    setCurrentAnimatingIndex(0);
  }, [isReady, countedBadges.length]);

  const handleBadgeAnimationComplete = useCallback(() => {
    setShownBadges((prev) => {
      // Get the badge that just finished animating based on current shown count
      const nextIndex = prev.length;
      const badge = countedBadges[nextIndex];
      if (!badge) return prev;
      return [...prev, badge];
    });

    setCurrentAnimatingIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex >= countedBadges.length) {
        // All badges shown
        onAllBadgesShown?.();
      }
      return nextIndex;
    });
  }, [countedBadges, onAllBadgesShown]);

  if (countedBadges.length === 0) return null;

  // Check if we're still animating (must be ready and have a valid index)
  const isAnimating =
    isReady &&
    currentAnimatingIndex >= 0 &&
    currentAnimatingIndex < countedBadges.length;
  const currentBadge = isAnimating
    ? countedBadges[currentAnimatingIndex]
    : null;

  return (
    <div className="w-full">
      {/* Revolver container - horizontal line of badges */}
      <div className="flex items-center justify-center gap-2 min-h-[72px] py-2">
        {/* Already shown badges */}
        {shownBadges.map((item) => (
          <SettledBadge
            key={`shown-${item.badge.id}`}
            badge={item.badge}
            count={item.count}
          />
        ))}

        {/* Target position for flying badge */}
        <div ref={targetRef} className="relative">
          {/* Placeholder for current slot */}
          {currentBadge && (
            <div className="w-14 h-16 rounded-lg border-2 border-dashed border-gray-600/50 flex items-center justify-center">
              <span className="text-gray-600 text-lg">?</span>
            </div>
          )}
        </div>

        {/* Placeholder slots for remaining badges */}
        {Array.from({
          length: Math.max(
            0,
            countedBadges.length - shownBadges.length - (currentBadge ? 1 : 0),
          ),
        }).map((_, index) => (
          <div
            key={`placeholder-${index}`}
            className="w-14 h-16 rounded-lg border-2 border-dashed border-gray-600/50 flex items-center justify-center"
          >
            <span className="text-gray-600 text-lg">?</span>
          </div>
        ))}
      </div>

      {/* Currently animating badge - rendered outside the flow */}
      {currentBadge && (
        <AnimatingBadge
          key={`animating-${currentBadge.badge.id}-${currentAnimatingIndex}`}
          badge={currentBadge.badge}
          count={currentBadge.count}
          onAnimationComplete={handleBadgeAnimationComplete}
          targetRef={targetRef}
        />
      )}
    </div>
  );
}

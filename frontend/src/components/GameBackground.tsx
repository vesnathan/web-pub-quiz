"use client";

import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";

// Generate stable random values for animations
function generateStars(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: (i * 37 + 13) % 100,
    top: (i * 23 + 7) % 100,
    size: 1 + (i % 3),
    duration: 2 + (i % 3),
    delay: (i % 5) * 0.4,
  }));
}

// Hook to detect mobile viewport
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial width
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();

    // Listen for resize events
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

interface GameBackgroundProps {
  children: React.ReactNode;
  showLightBeams?: boolean;
  showStars?: boolean;
  className?: string;
}

export function GameBackground({
  children,
  showLightBeams = true,
  showStars = true,
  className = "",
}: GameBackgroundProps) {
  const stars = useMemo(() => generateStars(40), []);
  const isMobile = useIsMobile();

  // On mobile, disable animations to prevent flickering
  const shouldShowLightBeams = showLightBeams && !isMobile;
  const shouldShowStars = showStars && !isMobile;

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at center bottom, #2d1b69 0%, #1a0a3e 30%, #0d0620 60%, #000000 100%)",
      }}
    >
      {/* Animated Light Beams fanning out from bottom center - disabled on mobile */}
      {shouldShowLightBeams && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {[...Array(12)].map((_, i) => {
            const angle = -55 + (i * 110) / 11;
            const colors = [
              "rgba(255, 165, 0, 0.12)",
              "rgba(138, 43, 226, 0.1)",
              "rgba(255, 105, 180, 0.08)",
              "rgba(0, 191, 255, 0.1)",
            ];
            return (
              <motion.div
                key={`beam-${i}`}
                className="absolute"
                style={{
                  bottom: 0,
                  left: "50%",
                  width: 0,
                  height: 0,
                  borderLeft: "100px solid transparent",
                  borderRight: "100px solid transparent",
                  borderBottom: `100vh solid ${colors[i % 4]}`,
                  transformOrigin: "bottom center",
                  transform: `translateX(-50%) rotate(${angle}deg)`,
                  filter: "blur(40px)",
                }}
                animate={{
                  opacity: [0.2, 0.5, 0.2],
                }}
                transition={{
                  duration: 4 + (i % 3) * 0.5,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Animated Stars/Sparkles - disabled on mobile */}
      {shouldShowStars && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          {stars.map((star) => (
            <motion.div
              key={star.id}
              className="absolute rounded-full bg-white"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                boxShadow: "0 0 4px 1px rgba(255, 255, 255, 0.3)",
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: star.duration,
                repeat: Infinity,
                delay: star.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">{children}</div>
    </div>
  );
}

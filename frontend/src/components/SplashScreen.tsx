"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo3D } from "./Logo3D";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
  isConnected?: boolean;
  connectionTimeout?: number;
}

// Detect if running on mobile for performance optimizations
function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.innerWidth < 768 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    )
  );
}

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

function generateConfetti(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: (i * 41 + 17) % 100,
    color: [
      "#ff6b6b",
      "#4ecdc4",
      "#ffe66d",
      "#95e1d3",
      "#f38181",
      "#aa96da",
      "#fcbad3",
    ][i % 7],
    size: 6 + (i % 8),
    duration: 3 + (i % 4),
    delay: (i % 8) * 0.3,
    rotation: (i * 45) % 360,
  }));
}

export function SplashScreen({
  onComplete,
  minDuration = 3000,
  isConnected = false,
  connectionTimeout = 15000,
}: SplashScreenProps) {
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [showPlayButton, setShowPlayButton] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(isMobileDevice());
  }, []);

  // Memoize random elements to prevent regeneration on re-renders
  // Use fewer elements on mobile for better performance
  const stars = useMemo(() => generateStars(isMobile ? 25 : 60), [isMobile]);
  const confetti = useMemo(
    () => generateConfetti(isMobile ? 12 : 30),
    [isMobile],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDuration);
    return () => clearTimeout(timer);
  }, [minDuration]);

  // Connection timeout - if not connected after timeout, show error
  useEffect(() => {
    if (isConnected) return; // Already connected, no need for timeout

    const timer = setTimeout(() => {
      if (!isConnected) {
        setConnectionFailed(true);
      }
    }, connectionTimeout);
    return () => clearTimeout(timer);
  }, [isConnected, connectionTimeout]);

  useEffect(() => {
    if (minTimeElapsed && isConnected) {
      const timer = setTimeout(() => {
        setShowPlayButton(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [minTimeElapsed, isConnected]);

  const handleRetry = () => {
    window.location.reload();
  };

  const isReady = minTimeElapsed && isConnected;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at center bottom, #2d1b69 0%, #1a0a3e 30%, #0d0620 60%, #000000 100%)",
      }}
    >
      {/* Animated Light Beams fanning out from bottom center - triangular cones */}
      {/* Reduced beam count and blur on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(isMobile ? 6 : 12)].map((_, i) => {
          const beamCount = isMobile ? 6 : 12;
          const angle = -55 + (i * 110) / (beamCount - 1); // Fan from -55 to +55 degrees
          const colors = [
            "rgba(255, 165, 0, 0.25)",
            "rgba(138, 43, 226, 0.2)",
            "rgba(255, 105, 180, 0.18)",
            "rgba(0, 191, 255, 0.2)",
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
                borderLeft: `${isMobile ? 100 : 150}px solid transparent`,
                borderRight: `${isMobile ? 100 : 150}px solid transparent`,
                borderBottom: `100vh solid ${colors[i % 4]}`,
                transformOrigin: "bottom center",
                transform: `translateX(-50%) rotate(${angle}deg)`,
                filter: isMobile ? "blur(20px)" : "blur(30px)",
              }}
              animate={{
                opacity: [0.3, 0.7, 0.3],
              }}
              transition={{
                duration: 3 + (i % 3) * 0.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* Animated Stars/Sparkles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map((star) => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              boxShadow: "0 0 4px 1px rgba(255, 255, 255, 0.5)",
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [0.8, 1.3, 0.8],
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

      {/* Falling Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {confetti.map((piece) => (
          <motion.div
            key={piece.id}
            className="absolute"
            style={{
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size * 0.6,
              backgroundColor: piece.color,
              borderRadius: "2px",
            }}
            initial={{ top: "-5%", rotate: piece.rotation }}
            animate={{
              top: ["−5%", "105%"],
              rotate: [piece.rotation, piece.rotation + 360],
              x: [0, piece.id % 2 === 0 ? 30 : -30],
            }}
            transition={{
              duration: piece.duration,
              repeat: Infinity,
              delay: piece.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Colored stars around the logo - reduced on mobile for performance */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Yellow/Gold stars */}
        {[...Array(isMobile ? 4 : 8)].map((_, i) => {
          const count = isMobile ? 4 : 8;
          const angle = (i * 360) / count + 20;
          const radius = (isMobile ? 120 : 180) + (i % 3) * 40;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius - 40;
          return (
            <motion.div
              key={`gold-star-${i}`}
              className="absolute text-xl md:text-2xl"
              style={{
                left: "50%",
                top: "45%",
                x: x,
                y: y,
                textShadow: "0 0 10px #ffd700, 0 0 20px #ffd700",
              }}
              animate={{
                scale: [0.8, 1.2, 0.8],
                opacity: [0.6, 1, 0.6],
                rotate: [0, 20, 0],
              }}
              transition={{
                duration: 1.5 + (i % 3) * 0.5,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            >
              ⭐
            </motion.div>
          );
        })}

        {/* Pink/Magenta stars - hidden on mobile for performance */}
        {!isMobile &&
          [...Array(6)].map((_, i) => {
            const angle = (i * 360) / 6 + 50;
            const radius = 220 + (i % 2) * 30;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius - 30;
            return (
              <motion.div
                key={`pink-star-${i}`}
                className="absolute"
                style={{
                  left: "50%",
                  top: "45%",
                  x: x,
                  y: y,
                  width: 12 + (i % 3) * 4,
                  height: 12 + (i % 3) * 4,
                  background: "#ff69b4",
                  clipPath:
                    "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
                  filter: "drop-shadow(0 0 6px #ff69b4)",
                }}
                animate={{
                  scale: [0.7, 1.3, 0.7],
                  opacity: [0.5, 1, 0.5],
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeInOut",
                }}
              />
            );
          })}

        {/* Cyan/Blue sparkle dots - reduced on mobile */}
        {[...Array(isMobile ? 5 : 10)].map((_, i) => {
          const count = isMobile ? 5 : 10;
          const angle = (i * 360) / count;
          const radius = (isMobile ? 100 : 160) + (i % 4) * 25;
          const x = Math.cos((angle * Math.PI) / 180) * radius;
          const y = Math.sin((angle * Math.PI) / 180) * radius - 35;
          return (
            <motion.div
              key={`sparkle-${i}`}
              className="absolute rounded-full"
              style={{
                left: "50%",
                top: "45%",
                x: x,
                y: y,
                width: 6 + (i % 3) * 3,
                height: 6 + (i % 3) * 3,
                background: ["#00bfff", "#7fffd4", "#ffd700", "#ff69b4"][i % 4],
                boxShadow: isMobile
                  ? "none"
                  : `0 0 10px ${["#00bfff", "#7fffd4", "#ffd700", "#ff69b4"][i % 4]}`,
              }}
              animate={{
                scale: [0.5, 1.5, 0.5],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 1 + (i % 3) * 0.5,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4">
        {/* 3D Animated Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: -20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative w-[90vw] max-w-[500px] md:max-w-[600px] lg:max-w-[700px]"
        >
          <Logo3D animate={true} />
        </motion.div>

        {/* Play Now Button, Loading indicator, or Error state */}
        <div className="mt-4 h-28 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {connectionFailed ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center gap-4"
              >
                <p className="text-red-400 text-lg font-medium text-center">
                  Unable to connect to server
                </p>
                <motion.button
                  onClick={handleRetry}
                  className="px-8 py-3 text-lg font-bold text-white rounded-full cursor-pointer transform hover:scale-105 active:scale-95 transition-transform"
                  style={{
                    background:
                      "linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)",
                    boxShadow: "0 4px 20px rgba(99, 102, 241, 0.4)",
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Retry
                </motion.button>
              </motion.div>
            ) : showPlayButton ? (
              <motion.button
                key="play-button"
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                onClick={onComplete}
                className="relative px-16 py-5 text-2xl font-bold text-white rounded-full overflow-hidden cursor-pointer transform hover:scale-105 active:scale-95 transition-transform"
                style={{
                  background:
                    "linear-gradient(180deg, #ff6b35 0%, #e63946 50%, #c1121f 100%)",
                  boxShadow:
                    "0 6px 30px rgba(230, 57, 70, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.3), inset 0 -3px 0 rgba(0, 0, 0, 0.2)",
                }}
              >
                <motion.span
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)",
                  }}
                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <span className="relative">Play Now</span>
              </motion.button>
            ) : (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex gap-3">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-4 h-4 rounded-full"
                      style={{
                        background: "linear-gradient(135deg, #ffd700, #ff69b4)",
                        boxShadow: "0 0 10px rgba(255, 215, 0, 0.5)",
                      }}
                      animate={{
                        y: [0, -15, 0],
                        scale: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.15,
                      }}
                    />
                  ))}
                </div>
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-purple-200 text-lg font-medium"
                >
                  {isReady
                    ? "Ready!"
                    : minTimeElapsed
                      ? "Connecting..."
                      : "Loading..."}
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom spotlight effects */}
      <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-24 h-full bg-gradient-to-t from-cyan-500/20 to-transparent blur-xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-full bg-gradient-to-t from-orange-500/25 to-transparent blur-xl" />
        <div className="absolute bottom-0 right-1/4 w-24 h-full bg-gradient-to-t from-pink-500/20 to-transparent blur-xl" />
      </div>
    </div>
  );
}

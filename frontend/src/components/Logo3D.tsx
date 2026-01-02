"use client";

import { useEffect, useRef } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

// =============================================================================
// LAYER POSITIONING - Adjust these values to move elements around
// All positions are OFFSETS FROM CENTER (negative = left, positive = right)
// =============================================================================

const LAYERS = {
  board: {
    top: 18,
    offsetX: 0, // Centered
    width: 70,
    scale: 1.2,
    zIndex: 0,
    parallaxX: -5, // Moves opposite direction (negative = inverse)
    parallaxY: -2,
  },

  mic: {
    top: 12,
    offsetX: -15, // Left of center
    width: 18,
    scale: 1.5,
    zIndex: 2,
    parallaxX: 10, // Pixels of movement at screen edge
    parallaxY: 0,
    parallaxRotate: 8,
  },
  questionMark: {
    top: 10,
    offsetX: 0, // Right of center
    width: 12,
    scale: 1,
    zIndex: 2,
    parallaxX: 10, // Foreground moves most
    parallaxY: 0,
  },

  live: {
    top: 52,
    offsetX: 0, // Slightly right of center
    width: 28,
    scale: 1,
    zIndex: 3,
    parallaxX: 20,
    parallaxY: 0,
  },

  quizNight: {
    top: 30,
    offsetX: 0, // Centered
    width: 60,
    scale: 1.2,
    zIndex: 4,
    parallaxX: 30,
    parallaxY: 0,
  },
};

// =============================================================================

interface Logo3DProps {
  className?: string;
  animate?: boolean;
}

export function Logo3D({ className = "", animate = true }: Logo3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Smooth spring animation for mouse movement
  // 0 = center, -1 = left/up, 1 = right/down
  const springConfig = { stiffness: 150, damping: 20 };
  const mouseX = useSpring(0, springConfig);
  const mouseY = useSpring(0, springConfig);

  useEffect(() => {
    if (!animate) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Check if mouse is outside the viewport
      if (
        e.clientX <= 0 ||
        e.clientX >= window.innerWidth ||
        e.clientY <= 0 ||
        e.clientY >= window.innerHeight
      ) {
        // Mouse is outside - reset to center
        mouseX.set(0);
        mouseY.set(0);
        return;
      }

      // Normalize mouse position to -1 to 1 range across the full screen
      // 0 = screen center, -1 = left edge, 1 = right edge
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;

      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseLeave = () => {
      // Reset to center when mouse leaves the window
      mouseX.set(0);
      mouseY.set(0);
    };

    const handleMouseOut = (e: MouseEvent) => {
      // Check if mouse actually left the document (relatedTarget is null)
      if (e.relatedTarget === null) {
        mouseX.set(0);
        mouseY.set(0);
      }
    };

    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // gamma: left/right tilt (-90 to 90)
      // beta: front/back tilt (-180 to 180)
      const x = e.gamma / 45; // Normalize to roughly -1 to 1
      const y = (e.beta - 45) / 45; // Center around 45 degrees (phone held up)

      mouseX.set(Math.max(-1, Math.min(1, x)));
      mouseY.set(Math.max(-1, Math.min(1, y)));
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("blur", handleMouseLeave);
    window.addEventListener("deviceorientation", handleDeviceOrientation);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("blur", handleMouseLeave);
      window.removeEventListener("deviceorientation", handleDeviceOrientation);
    };
  }, [animate, mouseX, mouseY]);

  // Transform mouse position to layer offsets (using LAYERS config)
  const micX = useTransform(
    mouseX,
    [-1, 1],
    [-LAYERS.mic.parallaxX, LAYERS.mic.parallaxX],
  );
  const micY = useTransform(
    mouseY,
    [-1, 1],
    [-LAYERS.mic.parallaxY, LAYERS.mic.parallaxY],
  );
  const micRotate = useTransform(
    mouseX,
    [-1, 1],
    [-LAYERS.mic.parallaxRotate, LAYERS.mic.parallaxRotate],
  );

  const textX = useTransform(
    mouseX,
    [-1, 1],
    [-LAYERS.quizNight.parallaxX, LAYERS.quizNight.parallaxX],
  );
  const textY = useTransform(
    mouseY,
    [-1, 1],
    [-LAYERS.quizNight.parallaxY, LAYERS.quizNight.parallaxY],
  );

  const questionX = useTransform(
    mouseX,
    [-1, 1],
    [-LAYERS.questionMark.parallaxX, LAYERS.questionMark.parallaxX],
  );
  const questionY = useTransform(
    mouseY,
    [-1, 1],
    [-LAYERS.questionMark.parallaxY, LAYERS.questionMark.parallaxY],
  );

  const liveX = useTransform(
    mouseX,
    [-1, 1],
    [-LAYERS.live.parallaxX, LAYERS.live.parallaxX],
  );
  const liveY = useTransform(
    mouseY,
    [-1, 1],
    [-LAYERS.live.parallaxY, LAYERS.live.parallaxY],
  );

  // Board moves in opposite direction (creates depth)
  const boardX = useTransform(
    mouseX,
    [-1, 1],
    [-LAYERS.board.parallaxX, LAYERS.board.parallaxX],
  );
  const boardY = useTransform(
    mouseY,
    [-1, 1],
    [-LAYERS.board.parallaxY, LAYERS.board.parallaxY],
  );

  // Helper to calculate left position from center offset
  // Formula: 50% (center) + offsetX - (width/2) to center the element
  const getLeftStyle = (layer: { offsetX: number; width: number }) =>
    `calc(50% + ${layer.offsetX}% - ${layer.width / 2}%)`;

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width: "100%",
        maxWidth: "500px",
        aspectRatio: "809/500",
        margin: "0 auto",
      }}
    >
      {/* Layer 0: Board (background - moves opposite direction for depth) */}
      <motion.div
        className="absolute"
        style={{
          width: `${LAYERS.board.width}%`,
          top: `${LAYERS.board.top}%`,
          left: getLeftStyle(LAYERS.board),
          zIndex: LAYERS.board.zIndex,
          x: boardX,
          y: boardY,
          scale: LAYERS.board.scale,
        }}
      >
        <img
          src="/sign/board.png"
          alt=""
          className="w-full h-auto"
          style={{
            filter: "drop-shadow(0 10px 30px rgba(255, 100, 0, 0.4))",
          }}
        />
      </motion.div>

      {/* Layer 1: Microphone (parallax layer) */}
      <motion.div
        className="absolute"
        style={{
          width: `${LAYERS.mic.width}%`,
          top: `${LAYERS.mic.top}%`,
          left: getLeftStyle(LAYERS.mic),
          zIndex: LAYERS.mic.zIndex,
          x: micX,
          y: micY,
          rotate: micRotate,
          scale: LAYERS.mic.scale,
        }}
      >
        <img
          src="/sign/mic.png"
          alt=""
          className="w-full h-auto"
          style={{
            filter: "drop-shadow(0 6px 15px rgba(0, 0, 50, 0.4))",
          }}
        />
      </motion.div>

      {/* Layer 2: Quiz-night text (parallax layer) */}
      <motion.div
        className="absolute"
        style={{
          width: `${LAYERS.quizNight.width}%`,
          top: `${LAYERS.quizNight.top}%`,
          left: getLeftStyle(LAYERS.quizNight),
          zIndex: LAYERS.quizNight.zIndex,
          x: textX,
          y: textY,
          scale: LAYERS.quizNight.scale,
        }}
      >
        <img
          src="/sign/quiz-night.png"
          alt="QuizNight"
          className="w-full h-auto"
          style={{
            filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))",
          }}
        />
      </motion.div>

      {/* Layer 3: Question mark (parallax layer - moves most) */}
      <motion.div
        className="absolute"
        style={{
          width: `${LAYERS.questionMark.width}%`,
          top: `${LAYERS.questionMark.top}%`,
          left: getLeftStyle(LAYERS.questionMark),
          zIndex: LAYERS.questionMark.zIndex,
          x: questionX,
          y: questionY,
          scale: LAYERS.questionMark.scale,
        }}
      >
        <img
          src="/sign/q-mark.png"
          alt="?"
          className="w-full h-auto"
          style={{
            filter: "drop-shadow(0 4px 12px rgba(150, 255, 0, 0.5))",
          }}
        />
      </motion.div>

      {/* Layer 4: .live badge (parallax layer) */}
      <motion.div
        className="absolute"
        style={{
          width: `${LAYERS.live.width}%`,
          top: `${LAYERS.live.top}%`,
          left: getLeftStyle(LAYERS.live),
          zIndex: LAYERS.live.zIndex,
          x: liveX,
          y: liveY,
          scale: LAYERS.live.scale,
        }}
      >
        <img
          src="/sign/live.png"
          alt=".live"
          className="w-full h-auto"
          style={{
            filter: "drop-shadow(0 5px 12px rgba(255, 0, 0, 0.4))",
          }}
        />
      </motion.div>
    </div>
  );
}

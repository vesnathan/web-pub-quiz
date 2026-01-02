"use client";

import { useEffect } from "react";
import { useGameStore } from "@/stores/gameStore";

/**
 * Anti-cheat hook that detects when the user leaves the tab during a question.
 * If they leave and come back, they are banned from buzzing/answering for that question.
 */
export function useAntiCheat() {
  const gamePhase = useGameStore((state) => state.gamePhase);
  const setLeftTabDuringQuestion = useGameStore(
    (state) => state.setLeftTabDuringQuestion,
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only flag as cheating if they leave during an active question or answering phase
      if (
        document.hidden &&
        (gamePhase === "question" || gamePhase === "answering")
      ) {
        setLeftTabDuringQuestion(true);
      }
    };

    // Also detect window blur (catches some cases visibility doesn't)
    const handleBlur = () => {
      if (gamePhase === "question" || gamePhase === "answering") {
        setLeftTabDuringQuestion(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [gamePhase, setLeftTabDuringQuestion]);
}

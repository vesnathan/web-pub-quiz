"use client";

import { useEffect, useRef, useCallback } from "react";
import { AblyService } from "@/services/AblyService";
import { useGameStore } from "@/stores/gameStore";

interface PlayerActionsReturn {
  buzz: (timestamp: number, latency: number) => void;
  answer: (answerIndex: number) => void;
}

/**
 * Hook for player actions (buzz and answer)
 * Handles publishing events to Ably channel
 */
export function usePlayerActions(): PlayerActionsReturn {
  const player = useGameStore((state) => state.player);

  const buzz = useCallback(
    (timestamp: number, latency: number) => {
      if (!player) return;

      const adjustedTimestamp = timestamp - latency / 2;

      AblyService.publishToRoom("buzz", {
        playerId: player.id,
        displayName: player.displayName,
        timestamp,
        latency,
        adjustedTimestamp,
      });
    },
    [player],
  );

  const answer = useCallback(
    (answerIndex: number) => {
      if (!player) return;

      AblyService.publishToRoom("answer", {
        playerId: player.id,
        answerIndex,
      });
    },
    [player],
  );

  return { buzz, answer };
}

/**
 * Hook that sets up window event listeners for buzz and answer
 * Connects UI events to Ably channel publishing
 */
export function usePlayerEventListeners(): void {
  const hasSetupRef = useRef(false);
  const player = useGameStore((state) => state.player);
  const { buzz, answer } = usePlayerActions();

  useEffect(() => {
    if (!player || hasSetupRef.current) return;
    hasSetupRef.current = true;

    const handleBuzz = (e: CustomEvent) => {
      const { timestamp, latency } = e.detail;
      buzz(timestamp, latency);
    };

    const handleAnswer = (e: CustomEvent) => {
      const { answerIndex } = e.detail;
      answer(answerIndex);
    };

    window.addEventListener("playerBuzz", handleBuzz as EventListener);
    window.addEventListener("playerAnswer", handleAnswer as EventListener);

    return () => {
      window.removeEventListener("playerBuzz", handleBuzz as EventListener);
      window.removeEventListener("playerAnswer", handleAnswer as EventListener);
      hasSetupRef.current = false;
    };
  }, [player, buzz, answer]);
}

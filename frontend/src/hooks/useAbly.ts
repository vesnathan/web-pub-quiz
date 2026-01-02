"use client";

import { useEffect } from "react";
import { AblyService } from "@/services/AblyService";
import { useGameStore } from "@/stores/gameStore";
import { useAuth } from "@/contexts/AuthContext";
import { useGameEventHandlers } from "./useGameEventHandlers";
import { usePlayerEventListeners } from "./usePlayerActions";

/**
 * Main Ably connection hook
 * Orchestrates connection, subscriptions, and player actions
 *
 * @param roomId - Optional room ID override (uses store roomId if not provided)
 */
export function useAbly(roomId?: string | null): void {
  const { isAuthenticated } = useAuth();
  const player = useGameStore((state) => state.player);
  const currentRoomId = useGameStore((state) => state.currentRoomId);
  const addLatencySample = useGameStore((state) => state.addLatencySample);
  const setPlayers = useGameStore((state) => state.setPlayers);

  const effectiveRoomId = roomId || currentRoomId;
  const {
    setupRoomSubscriptions,
    setupUserSubscriptions,
    setupPresenceSubscriptions,
  } = useGameEventHandlers();

  // Set up player event listeners (buzz/answer)
  usePlayerEventListeners();

  // Initialize Ably connection and subscriptions
  useEffect(() => {
    if (!player || !isAuthenticated || !effectiveRoomId) return;

    let cleanupRoom: (() => void) | null = null;
    let cleanupUser: (() => void) | null = null;
    let cleanupPresence: (() => void) | null = null;

    const init = async () => {
      const channels = await AblyService.connect(player.id, effectiveRoomId);
      if (!channels) return;

      const { roomChannel, userChannel } = channels;

      // Set up event subscriptions
      cleanupRoom = setupRoomSubscriptions(roomChannel);
      cleanupUser = setupUserSubscriptions(userChannel, () => {
        AblyService.disconnect();
      });
      cleanupPresence = setupPresenceSubscriptions(roomChannel);

      // Enter presence
      await AblyService.enterPresence(player.displayName);

      // Get initial presence members
      const members = await AblyService.getPresenceMembers();
      const players = members.map((m) => ({
        id: m.clientId!,
        displayName: m.data?.displayName || "Player",
        isAI: false,
        latency: 0,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        joinedAt: Date.now(),
      }));
      setPlayers(players);

      // Start latency measurement
      AblyService.startLatencyMeasurement(addLatencySample);
    };

    init();

    return () => {
      cleanupRoom?.();
      cleanupUser?.();
      cleanupPresence?.();
      AblyService.release();
    };
  }, [
    player?.id,
    player?.displayName,
    isAuthenticated,
    effectiveRoomId,
    setupRoomSubscriptions,
    setupUserSubscriptions,
    setupPresenceSubscriptions,
    addLatencySample,
    setPlayers,
  ]);
}

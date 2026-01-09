"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AblyService } from "@/services/AblyService";
import { useGameStore } from "@/stores/gameStore";
import { useGameEventHandlers } from "./useGameEventHandlers";
import { usePlayerEventListeners } from "./usePlayerActions";

/**
 * Main Ably connection hook
 * Orchestrates connection, subscriptions, and player actions
 *
 * @param roomId - Optional room ID override (uses store roomId if not provided)
 */
export function useAbly(roomId?: string | null): void {
  const router = useRouter();
  const player = useGameStore((state) => state.player);
  const currentRoomId = useGameStore((state) => state.currentRoomId);
  const addLatencySample = useGameStore((state) => state.addLatencySample);
  const setPlayers = useGameStore((state) => state.setPlayers);
  const resetGame = useGameStore((state) => state.resetGame);

  const effectiveRoomId = roomId || currentRoomId;
  const {
    setupRoomSubscriptions,
    setupUserSubscriptions,
    setupPresenceSubscriptions,
  } = useGameEventHandlers();

  // Set up player event listeners (buzz/answer)
  usePlayerEventListeners();

  // Handle disconnect - redirect to lobby
  const handleDisconnect = useCallback(
    (reason: string) => {
      console.log(`[useAbly] Disconnected: ${reason}`);
      resetGame();
      router.push("/rooms");
    },
    [resetGame, router],
  );

  // Initialize Ably connection and subscriptions
  useEffect(() => {
    // Allow both authenticated users and guests with a player to connect
    if (!player || !effectiveRoomId) return;

    let cleanupRoom: (() => void) | null = null;
    let cleanupUser: (() => void) | null = null;
    let cleanupPresence: (() => void) | null = null;
    let cleanupDisconnect: (() => void) | null = null;

    const init = async () => {
      console.log(
        `[useAbly] Initializing for player ${player.id} in room ${effectiveRoomId}`,
      );
      const channels = await AblyService.connect(player.id, effectiveRoomId);
      if (!channels) {
        console.error("[useAbly] Failed to connect to Ably");
        return;
      }

      const { roomChannel, userChannel } = channels;
      console.log(`[useAbly] Connected to room channel: ${roomChannel.name}`);

      // Set up event subscriptions
      cleanupRoom = setupRoomSubscriptions(roomChannel);
      cleanupUser = setupUserSubscriptions(userChannel, () => {
        AblyService.disconnect();
      });
      cleanupPresence = setupPresenceSubscriptions(roomChannel);

      // Register disconnect callback
      cleanupDisconnect = AblyService.onDisconnect(handleDisconnect);

      // Enter presence
      const enteredPresence = await AblyService.enterPresence(
        player.displayName,
      );
      if (!enteredPresence) {
        console.error(
          "[useAbly] Failed to enter presence - set may not start!",
        );
      }

      // Get initial presence members
      const members = await AblyService.getPresenceMembers();
      console.log(`[useAbly] Current presence members: ${members.length}`);
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
      cleanupDisconnect?.();
      AblyService.release();
    };
  }, [
    player?.id,
    player?.displayName,
    effectiveRoomId,
    setupRoomSubscriptions,
    setupUserSubscriptions,
    setupPresenceSubscriptions,
    addLatencySample,
    setPlayers,
    handleDisconnect,
  ]);
}

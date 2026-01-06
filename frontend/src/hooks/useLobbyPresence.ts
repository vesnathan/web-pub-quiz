"use client";

import { useEffect, useSyncExternalStore } from "react";
import Ably from "ably";
import { ABLY_CHANNELS } from "@quiz/shared";
import { useGameStore } from "@/stores/gameStore";
import type { QuestionStartPayload } from "@quiz/shared";

interface ActiveUser {
  clientId: string;
  username: string;
  displayName: string;
}

// Singleton state management outside React
let ably: Ably.Realtime | null = null;
let activeUsers: ActiveUser[] = [];
let isConnected = false;
let subscribers = new Set<() => void>();
let refCount = 0;

function notifySubscribers() {
  subscribers.forEach((cb) => cb());
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function getActiveUsers() {
  return activeUsers;
}

function getIsConnected() {
  return isConnected;
}

// Handle page unload - leave presence before closing
function handleBeforeUnload() {
  if (ably) {
    try {
      const channel = ably.channels.get(ABLY_CHANNELS.LOBBY);
      // Use sendBeacon-style sync leave for reliability on page unload
      channel.presence.leave();
    } catch {
      // Ignore errors during unload
    }
  }
}

function initAbly(userId?: string, displayName?: string) {
  const ablyKey = process.env.NEXT_PUBLIC_ABLY_KEY;

  if (!ablyKey) {
    console.error("[useLobbyPresence] No NEXT_PUBLIC_ABLY_KEY found");
    return;
  }
  if (ably) return;

  // Add beforeunload handler to leave presence on page refresh/close
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", handleBeforeUnload);
  }

  ably = new Ably.Realtime({
    key: ablyKey,
    clientId: userId || `anon-${Date.now()}`,
  });

  ably.connection.on("connected", () => {
    isConnected = true;
    notifySubscribers();
  });

  ably.connection.on("disconnected", () => {
    isConnected = false;
    notifySubscribers();
  });

  ably.connection.on("failed", (stateChange) => {
    console.error(
      "[useLobbyPresence] Ably connection failed:",
      stateChange?.reason,
    );
    isConnected = false;
    notifySubscribers();
  });

  const channel = ably.channels.get(ABLY_CHANNELS.LOBBY);
  const presence = channel.presence;

  presence.subscribe("enter", (member) => {
    if (!activeUsers.some((u) => u.clientId === member.clientId)) {
      activeUsers = [
        ...activeUsers,
        {
          clientId: member.clientId!,
          username: member.data?.username || "Player",
          displayName:
            member.data?.displayName || member.data?.username || "Player",
        },
      ];
      notifySubscribers();
    }
  });

  presence.subscribe("leave", (member) => {
    activeUsers = activeUsers.filter((u) => u.clientId !== member.clientId);
    notifySubscribers();
  });

  // Note: room_list subscription removed - useLobbyChannel handles this for RoomList
  // This hook only handles presence (user count) and game events

  // Handle duplicate connection kick from orchestrator
  channel.subscribe("duplicate_connection", (message) => {
    const { clientId: kickedClientId } = message.data;
    // Check if this message is for us
    if (ably?.auth.clientId === kickedClientId) {
      console.log(
        "[useLobbyPresence] Kicked due to duplicate connection, closing...",
      );
      // Close this connection - newer connection takes over
      cleanupAbly();
    }
  });

  // Subscribe to game state events (question_start, set_end) for lobby display
  channel.subscribe("question_start", (message) => {
    const payload = message.data as QuestionStartPayload;
    useGameStore
      .getState()
      .setCurrentQuestion(
        payload.question,
        payload.questionIndex,
        payload.totalQuestions,
        payload.questionDuration,
      );
    useGameStore.getState().setSetActive(true);
  });

  channel.subscribe("set_end", () => {
    useGameStore.getState().setSetActive(false);
  });

  // Enter presence, fetch members, and get current game state when connected
  ably.connection.once("connected", async () => {
    try {
      // Only enter presence if we have a real user ID (authenticated)
      if (userId && displayName) {
        await presence.enter({ displayName });
      }

      const members = await presence.get();
      activeUsers = members.map((m) => ({
        clientId: m.clientId!,
        username: m.data?.username || "Player",
        displayName: m.data?.displayName || m.data?.username || "Player",
      }));
      notifySubscribers();

      // Game state received via useLobbyChannel's room_list subscription
    } catch (e) {
      console.error("Failed to initialize lobby state:", e);
    }
  });

  // Periodically resync presence to correct any drift (every 30 seconds)
  const resyncInterval = setInterval(async () => {
    if (ably?.connection.state === "connected") {
      try {
        const members = await presence.get();
        activeUsers = members.map((m) => ({
          clientId: m.clientId!,
          username: m.data?.username || "Player",
          displayName: m.data?.displayName || m.data?.username || "Player",
        }));
        notifySubscribers();
      } catch (e) {
        // Ignore resync errors
      }
    }
  }, 30000);

  // Store interval for cleanup
  (
    ably as Ably.Realtime & { _presenceResyncInterval?: NodeJS.Timeout }
  )._presenceResyncInterval = resyncInterval;
}

async function cleanupAbly() {
  // Remove beforeunload handler
  if (typeof window !== "undefined") {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  }

  if (ably) {
    try {
      // Clear the resync interval
      const ablyWithInterval = ably as Ably.Realtime & {
        _presenceResyncInterval?: NodeJS.Timeout;
      };
      if (ablyWithInterval._presenceResyncInterval) {
        clearInterval(ablyWithInterval._presenceResyncInterval);
      }

      const channel = ably.channels.get(ABLY_CHANNELS.LOBBY);
      // Only leave presence if channel is still attached
      if (channel.state === "attached") {
        await channel.presence.leave().catch(() => {
          // Ignore leave errors
        });
      }
      // Unsubscribe only if channel is not detached/failed
      if (channel.state !== "detached" && channel.state !== "failed") {
        channel.unsubscribe();
        channel.presence.unsubscribe();
      }
    } catch {
      // Ignore cleanup errors
    }
    ably.close();
    ably = null;
    activeUsers = [];
    isConnected = false;
    notifySubscribers();
  }
}

interface UseLobbyPresenceOptions {
  enabled: boolean;
  userId?: string;
  displayName?: string;
}

export function useLobbyPresence(
  options: UseLobbyPresenceOptions = { enabled: false },
) {
  const { enabled, userId, displayName } = options;

  // Use useSyncExternalStore for reactive updates
  const allUsers = useSyncExternalStore(
    subscribe,
    getActiveUsers,
    getActiveUsers,
  );
  const connected = useSyncExternalStore(
    subscribe,
    getIsConnected,
    getIsConnected,
  );

  // Deduplicate users by displayName (same user with multiple connections)
  const users = allUsers.filter(
    (user, index, self) =>
      index === self.findIndex((u) => u.displayName === user.displayName),
  );

  useEffect(() => {
    if (!enabled) return;

    refCount++;
    if (refCount === 1) {
      initAbly(userId, displayName);
    }

    return () => {
      refCount--;
      if (refCount === 0) {
        setTimeout(() => {
          if (refCount === 0) {
            cleanupAbly();
          }
        }, 100);
      }
    };
  }, [enabled, userId, displayName]);

  return {
    activeUsers: users,
    activeUserCount: users.length,
    isConnected: connected,
  };
}

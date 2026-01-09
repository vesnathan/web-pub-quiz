import { useEffect, useState, useCallback, useRef } from "react";
import Ably from "ably";
import { ABLY_CHANNELS } from "@quiz/shared";
import type { RoomListItem } from "@quiz/shared";
import { useAuth } from "@/contexts/AuthContext";
import { graphqlClient } from "@/lib/graphql";
import { GET_ROOM_LIST } from "@/graphql/queries";

const POLL_INTERVAL_MS = 10000; // Poll every 10 seconds

// GraphQL response type
interface GetRoomListResponse {
  data?: {
    getRoomList?: {
      rooms: RoomListItem[];
      lobbyPlayerCount: number;
      maintenanceMode: boolean;
      maintenanceMessage: string | null;
      updatedAt: string;
    };
  };
}

interface GuestInfo {
  guestId: string;
  displayName: string;
}

interface UseLobbyChannelReturn {
  rooms: RoomListItem[];
  isConnected: boolean;
  lobbyPlayerCount: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  setMaintenanceMode: (enabled: boolean, message?: string) => void;
  joinRoom: (
    roomId: string,
    guest?: GuestInfo,
  ) => Promise<{
    success: boolean;
    roomId?: string;
    roomName?: string;
    error?: string;
  }>;
}

// Store channel ref for beforeunload handler
let lobbyChannelRef: Ably.RealtimeChannel | null = null;

// Handle page unload - leave presence before closing
function handleBeforeUnload() {
  if (lobbyChannelRef) {
    try {
      lobbyChannelRef.presence.leave();
    } catch {
      // Ignore errors during unload
    }
  }
}

export function useLobbyChannel(): UseLobbyChannelReturn {
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lobbyPlayerCount, setLobbyPlayerCount] = useState(0);
  const [maintenanceMode, setMaintenanceModeState] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(
    null,
  );
  const [channel, setChannel] = useState<Ably.RealtimeChannel | null>(null);
  const { user } = useAuth();
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Poll room list via AppSync/GraphQL
  const fetchRoomList = useCallback(async () => {
    try {
      // Use userPool auth if logged in, otherwise try iam (requires Identity Pool unauth access)
      const result = (await graphqlClient.graphql({
        query: GET_ROOM_LIST,
        authMode: user ? "userPool" : "iam",
      })) as GetRoomListResponse;

      const data = result.data?.getRoomList;
      if (data) {
        setRooms(data.rooms || []);
        setLobbyPlayerCount(data.lobbyPlayerCount || 0);
        if (data.maintenanceMode !== undefined) {
          setMaintenanceModeState(data.maintenanceMode);
          setMaintenanceMessage(data.maintenanceMessage || null);
        }
      }
    } catch (error) {
      console.error("Failed to fetch room list:", error);
    }
  }, [user]);

  // Start polling when component mounts
  useEffect(() => {
    // Initial fetch
    fetchRoomList();

    // Poll every 10 seconds
    pollIntervalRef.current = setInterval(fetchRoomList, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [fetchRoomList]);

  useEffect(() => {
    const ablyKey = process.env.NEXT_PUBLIC_ABLY_KEY;
    if (!ablyKey) return;

    // Use user ID if authenticated, otherwise anonymous client ID
    const clientId = user?.userId || `anon-${Date.now()}`;
    const ablyClient = new Ably.Realtime({
      key: ablyKey,
      clientId,
    });

    ablyClient.connection.on("connected", () => {
      setIsConnected(true);
    });

    ablyClient.connection.on("disconnected", () => {
      setIsConnected(false);
    });

    const lobbyChannel = ablyClient.channels.get(ABLY_CHANNELS.LOBBY);
    setChannel(lobbyChannel);
    lobbyChannelRef = lobbyChannel;

    // Add beforeunload handler to leave presence on page refresh/close
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Subscribe to room updates
    lobbyChannel.subscribe("room_update", (message) => {
      const { rooms: roomList } = message.data;
      if (roomList) {
        setRooms(roomList);
      }
    });

    // Subscribe to maintenance mode updates
    lobbyChannel.subscribe("maintenance_update", (message) => {
      const { enabled, customMessage } = message.data;
      setMaintenanceModeState(enabled);
      setMaintenanceMessage(customMessage || null);
    });

    // Only enter presence if authenticated (so player count only shows logged-in users)
    if (user?.userId) {
      lobbyChannel.presence.enter({
        displayName: user.name || user.email?.split("@")[0] || "Anonymous",
      });
    }

    return () => {
      // Remove beforeunload handler
      window.removeEventListener("beforeunload", handleBeforeUnload);
      lobbyChannelRef = null;

      // Only leave presence if we entered and channel is still attached
      try {
        if (user?.userId && lobbyChannel.state === "attached") {
          lobbyChannel.presence.leave().catch(() => {
            // Ignore errors during cleanup
          });
        }
        if (
          lobbyChannel.state !== "detached" &&
          lobbyChannel.state !== "failed"
        ) {
          lobbyChannel.unsubscribe();
        }
      } catch {
        // Ignore errors during cleanup
      }
      ablyClient.close();
    };
  }, [user?.userId, user?.name, user?.email]);

  const joinRoom = useCallback(
    async (
      roomId: string,
      guest?: GuestInfo,
    ): Promise<{
      success: boolean;
      roomId?: string;
      roomName?: string;
      error?: string;
    }> => {
      if (!channel) {
        return { success: false, error: "Not connected to lobby" };
      }

      // Use guest info or authenticated user
      const playerId = guest?.guestId || user?.userId;
      const displayName =
        guest?.displayName ||
        user?.name ||
        user?.email?.split("@")[0] ||
        "Anonymous";

      if (!playerId) {
        return { success: false, error: "No player identity" };
      }

      return new Promise((resolve) => {
        const handleResult = (message: Ably.Message) => {
          const data = message.data;
          if (data.playerId === playerId) {
            channel.unsubscribe("join_room_result", handleResult);
            resolve({
              success: data.success,
              roomId: data.roomId,
              roomName: data.roomName,
              error: data.error,
            });
          }
        };

        channel.subscribe("join_room_result", handleResult);
        channel.publish("join_room", {
          playerId,
          roomId,
          displayName,
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          channel.unsubscribe("join_room_result", handleResult);
          resolve({ success: false, error: "Request timed out" });
        }, 5000);
      });
    },
    [channel, user],
  );

  const setMaintenanceMode = useCallback(
    (enabled: boolean, message?: string) => {
      if (!channel) return;
      channel.publish("maintenance_mode", {
        enabled,
        customMessage: message || null,
      });
      // Also update local state immediately for the admin
      setMaintenanceModeState(enabled);
      setMaintenanceMessage(message || null);
    },
    [channel],
  );

  return {
    rooms,
    isConnected,
    lobbyPlayerCount,
    maintenanceMode,
    maintenanceMessage,
    setMaintenanceMode,
    joinRoom,
  };
}

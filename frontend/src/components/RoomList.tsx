"use client";

import { useState, useEffect } from "react";
import { Card, CardBody, Button, Progress, Chip } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGameStore } from "@/stores/gameStore";
import { useLobbyChannel } from "@/hooks/useLobbyChannel";
import { useGuestSession } from "@/hooks/useGuestSession";
import { useFingerprint } from "@/hooks/useFingerprint";
import { LoadingDots } from "@/components/LoadingScreen";
import { MAX_PLAYERS_PER_ROOM, DIFFICULTY_POINTS } from "@quiz/shared";
import type { RoomListItem } from "@quiz/shared";

interface RoomListProps {
  onJoinRoom?: (roomId: string) => void;
  guestName?: string;
  isGuestNameValid?: boolean;
}

export function RoomList({
  onJoinRoom,
  guestName: externalGuestName,
  isGuestNameValid = true,
}: RoomListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { setPlayer, setCurrentRoomId, resetGame } = useGameStore();
  const { rooms, isConnected, joinRoom } = useLobbyChannel();
  const { createGuestSession } = useGuestSession();
  const { fingerprint } = useFingerprint();
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clientIp, setClientIp] = useState<string | null>(null);

  // Fetch client IP on mount
  useEffect(() => {
    fetch("https://api.ipify.org?format=json")
      .then((res) => res.json())
      .then((data) => setClientIp(data.ip))
      .catch(() => {
        // Fallback - IP tracking won't work but game still functions
        console.warn("Could not fetch client IP");
      });
  }, []);

  // Guest name comes from home page
  const guestName = externalGuestName ?? "";

  const handleJoinRoom = async (roomId: string) => {
    setJoining(roomId);
    setError(null);

    // Handle guest users
    let playerId: string;
    let displayName: string;
    let guestInfo:
      | {
          guestId: string;
          displayName: string;
          fingerprint?: string;
          clientIp?: string;
        }
      | undefined;

    if (user) {
      playerId = user.userId;
      displayName = user.name || user.email.split("@")[0];
    } else {
      // Guest user - need a valid name
      const trimmedName = guestName.trim();
      if (!trimmedName) {
        setError("Please enter a display name");
        setJoining(null);
        return;
      }
      if (trimmedName.length < 3) {
        setError("Display name must be at least 3 characters");
        setJoining(null);
        return;
      }
      if (!isGuestNameValid) {
        setError("This display name is already taken");
        setJoining(null);
        return;
      }
      const session = createGuestSession(trimmedName);
      playerId = session.guestId;
      displayName = session.displayName;
      guestInfo = {
        ...session,
        fingerprint: fingerprint || undefined,
        clientIp: clientIp || undefined,
      };
    }

    const result = await joinRoom(roomId, guestInfo);

    if (result.success && result.roomId) {
      // Reset any previous game state before joining new room
      resetGame();

      setPlayer({
        id: playerId,
        displayName,
        isAI: false,
        latency: 0,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        joinedAt: Date.now(),
      });
      setCurrentRoomId(result.roomId, result.roomName);

      if (onJoinRoom) {
        onJoinRoom(result.roomId);
      } else {
        router.push(`/game?roomId=${result.roomId}`);
      }
    } else {
      setError(result.error || "Failed to join room");
      setJoining(null);
    }
  };

  return (
    <Card className="bg-gray-900/70 backdrop-blur-sm">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Quiz Rooms</h2>
          <Chip
            color={isConnected ? "success" : "default"}
            variant="flat"
            size="sm"
          >
            {isConnected ? "Live" : "Connecting..."}
          </Chip>
        </div>

        <div className="bg-success-100/20 text-success-500 px-3 py-2 rounded-lg mb-4 text-sm text-center">
          Select a room to join the quiz!
        </div>

        {error && (
          <div className="bg-danger-100 text-danger-700 px-3 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Room List */}
        <div className="space-y-3">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <LoadingDots />
              <span className="text-gray-400 text-sm">Connecting...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No rooms available</p>
              <p className="text-sm mt-1">Rooms will appear shortly</p>
            </div>
          ) : (
            rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                joining={joining}
                onJoin={handleJoinRoom}
              />
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
}

interface RoomCardProps {
  room: RoomListItem;
  joining: string | null;
  onJoin: (roomId: string) => void;
}

function RoomCard({ room, joining, onJoin }: RoomCardProps) {
  const getRoomStatusColor = (
    room: RoomListItem,
  ): "success" | "warning" | "danger" | "default" => {
    if (room.currentPlayers >= room.maxPlayers) return "danger";
    if (room.inProgress) return "warning";
    if (room.currentPlayers > room.maxPlayers * 0.7) return "warning";
    return "success";
  };

  // Room is joinable if not full
  const isJoinable = room.currentPlayers < room.maxPlayers;

  // Get difficulty color and points based on room difficulty
  const getDifficultyConfig = (difficulty: string) => {
    const points =
      DIFFICULTY_POINTS[difficulty as keyof typeof DIFFICULTY_POINTS] ||
      DIFFICULTY_POINTS.medium;
    switch (difficulty) {
      case "easy":
        return {
          color: "success" as const,
          label: "Easy",
          correct: `+${points.correct}`,
          wrong: `${points.wrong}`,
        };
      case "hard":
        return {
          color: "danger" as const,
          label: "Hard",
          correct: `+${points.correct}`,
          wrong: `${points.wrong}`,
        };
      default:
        return {
          color: "warning" as const,
          label: "Medium",
          correct: `+${points.correct}`,
          wrong: `${points.wrong}`,
        };
    }
  };

  const diffConfig = getDifficultyConfig(room.difficulty);

  const getStatusChip = () => {
    if (room.currentPlayers >= room.maxPlayers) {
      return (
        <Chip color="danger" variant="flat" size="sm">
          Full
        </Chip>
      );
    }
    if (room.inProgress) {
      return (
        <Chip color="warning" variant="flat" size="sm">
          In progress
        </Chip>
      );
    }
    return (
      <Chip color="success" variant="flat" size="sm">
        Waiting
      </Chip>
    );
  };

  const getButtonText = () => {
    if (room.currentPlayers >= room.maxPlayers) return "Full";
    if (room.inProgress) return "Join Game";
    return "Join";
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 transition-colors hover:bg-gray-700/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{room.name}</span>
          <Chip color={diffConfig.color} variant="flat" size="sm">
            {diffConfig.label}
          </Chip>
        </div>
        {getStatusChip()}
      </div>

      {/* Points info */}
      <div className="flex items-center gap-3 text-xs mb-2">
        <span className="text-green-400">{diffConfig.correct} correct</span>
        <span className="text-red-400">{diffConfig.wrong} wrong</span>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Players</span>
          <span>
            {room.currentPlayers}/{room.maxPlayers}
          </span>
        </div>
        <Progress
          value={(room.currentPlayers / room.maxPlayers) * 100}
          color={getRoomStatusColor(room)}
          size="sm"
          className="h-1"
        />
      </div>

      <Button
        color={isJoinable ? "primary" : "default"}
        variant="flat"
        size="sm"
        className="w-full"
        isDisabled={!isJoinable || joining !== null}
        isLoading={joining === room.id}
        onPress={() => onJoin(room.id)}
      >
        {getButtonText()}
      </Button>
    </div>
  );
}

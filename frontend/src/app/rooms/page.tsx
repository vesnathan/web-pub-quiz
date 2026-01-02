"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Card,
  CardBody,
  Chip,
  Progress,
  CircularProgress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGameStore } from "@/stores/gameStore";
import { useLobbyChannel } from "@/hooks/useLobbyChannel";
import { useSubscription } from "@/hooks/useSubscription";
import { GameBackground } from "@/components/GameBackground";
import { CountdownTimer } from "@/components/CountdownTimer";
import { LobbyBottomBar } from "@/components/LobbyBottomBar";
import { LoadingScreen } from "@/components/LoadingScreen";
import type { RoomListItem } from "@quiz/shared";
import { FREE_TIER_DAILY_SET_LIMIT } from "@quiz/shared";

export default function RoomsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { nextSetTime, isSetActive, setPlayer, setCurrentRoomId } =
    useGameStore();
  const { rooms, isConnected, joinWindowOpen, secondsUntilJoinOpen, joinRoom } =
    useLobbyChannel();
  const {
    canPlaySet,
    setsRemainingToday,
    hasUnlimitedSets,
    tierName,
    recordSetPlayed,
  } = useSubscription();
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Use server-provided join window status
  const canJoin = joinWindowOpen;

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleJoinRoom = async (roomId: string) => {
    if (!user || !canJoin) return;

    // Check daily limit for free tier
    if (!canPlaySet) {
      setShowUpgradeModal(true);
      return;
    }

    setJoining(roomId);
    setError(null);

    const result = await joinRoom(roomId);

    if (result.success && result.roomId) {
      // Record set played for daily limit tracking
      await recordSetPlayed();

      // Set player and room in store
      setPlayer({
        id: user.userId,
        displayName: user.name || user.email.split("@")[0],
        isAI: false,
        latency: 0,
        score: 0,
        correctCount: 0,
        wrongCount: 0,
        joinedAt: Date.now(),
      });
      setCurrentRoomId(result.roomId);
      router.push(`/game?roomId=${result.roomId}`);
    } else {
      setError(result.error || "Failed to join room");
      setJoining(null);
    }
  };

  const getRoomStatusColor = (
    room: RoomListItem,
  ): "success" | "warning" | "danger" | "default" => {
    if (room.status === "in_progress") return "warning";
    if (room.currentPlayers >= room.maxPlayers) return "danger";
    if (room.currentPlayers > room.maxPlayers * 0.7) return "warning";
    return "success";
  };

  const getRoomStatusText = (room: RoomListItem): string => {
    if (room.status === "in_progress") return "In Progress";
    if (room.currentPlayers >= room.maxPlayers) return "Full";
    return "Waiting";
  };

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage (for 29 min countdown to join window)
  // Progress shrinks from 100% to 0% as time runs out
  const maxWaitSeconds = 29 * 60;
  const progressValue = canJoin
    ? 0
    : Math.min(100, ((secondsUntilJoinOpen || 0) / maxWaitSeconds) * 100);

  if (authLoading) {
    return <LoadingScreen />;
  }

  return (
    <GameBackground>
      <main className="p-4 sm:p-8 pb-20 flex-grow">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold">Select a Room</h1>
              <Chip color={isConnected ? "success" : "default"} variant="flat">
                {isConnected ? "Connected" : "Connecting..."}
              </Chip>
            </div>

            {/* Next Set Timer */}
            <Card className="bg-gray-900/70 backdrop-blur-sm mb-4">
              <CardBody className="p-4">
                <CountdownTimer
                  targetTime={nextSetTime}
                  isActive={isSetActive}
                />
              </CardBody>
            </Card>

            {/* Join Window Status */}
            {!canJoin && secondsUntilJoinOpen !== null && (
              <Card className="bg-gray-900/70 backdrop-blur-sm mb-4">
                <CardBody className="p-6">
                  <div className="flex flex-col items-center">
                    <CircularProgress
                      size="lg"
                      value={progressValue}
                      color="primary"
                      showValueLabel={false}
                      classNames={{
                        svg: "w-24 h-24",
                        track: "stroke-gray-700",
                      }}
                      aria-label="Time until join"
                    />
                    <div className="text-center mt-2">
                      <div className="text-2xl font-bold text-primary-400">
                        {formatTime(secondsUntilJoinOpen)}
                      </div>
                      <div className="text-sm text-gray-400">
                        until rooms open
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )}

            {canJoin && (
              <div className="bg-success-100/20 text-success-500 px-4 py-3 rounded-lg mb-4 text-center">
                Select a room to join the quiz!
              </div>
            )}

            {/* Daily Sets Remaining (for free tier) */}
            {!hasUnlimitedSets && (
              <div
                className={`px-4 py-3 rounded-lg mb-4 ${
                  setsRemainingToday === 0
                    ? "bg-red-900/30 border border-red-500/50"
                    : setsRemainingToday === 1
                      ? "bg-yellow-900/30 border border-yellow-500/50"
                      : "bg-gray-800/50 border border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-bold ${
                        setsRemainingToday === 0
                          ? "text-red-400"
                          : setsRemainingToday === 1
                            ? "text-yellow-400"
                            : "text-green-400"
                      }`}
                    >
                      {setsRemainingToday} / {FREE_TIER_DAILY_SET_LIMIT}
                    </span>
                    <span className="text-gray-400 text-sm">
                      free {setsRemainingToday === 1 ? "set" : "sets"} today
                    </span>
                  </div>
                  <Button
                    size="sm"
                    color="primary"
                    variant={setsRemainingToday === 0 ? "solid" : "flat"}
                    onPress={() => router.push("/subscribe")}
                  >
                    {setsRemainingToday === 0 ? "Upgrade Now" : "Upgrade"}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-danger-100 text-danger-700 px-4 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}
          </div>

          {/* Room List */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-300">
              Available Rooms
            </h2>

            {rooms.length === 0 ? (
              <Card className="bg-gray-900/70 backdrop-blur-sm">
                <CardBody className="p-8 text-center">
                  <p className="text-gray-400">
                    {isConnected
                      ? canJoin
                        ? "Rooms will appear shortly"
                        : "Rooms will appear when join opens"
                      : "Loading rooms..."}
                  </p>
                </CardBody>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {rooms.map((room) => {
                  const isJoinable =
                    canJoin &&
                    room.status === "waiting" &&
                    room.currentPlayers < room.maxPlayers;
                  return (
                    <Card
                      key={room.id}
                      className="bg-gray-900/70 backdrop-blur-sm hover:bg-gray-800/70 transition-colors"
                      isPressable={isJoinable}
                      onPress={() => isJoinable && handleJoinRoom(room.id)}
                    >
                      <CardBody className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-bold">{room.name}</h3>
                          <Chip
                            color={getRoomStatusColor(room)}
                            variant="flat"
                            size="sm"
                          >
                            {getRoomStatusText(room)}
                          </Chip>
                        </div>

                        {/* Player count bar */}
                        <div className="mb-3">
                          <div className="flex justify-between text-sm text-gray-400 mb-1">
                            <span>Players</span>
                            <span>
                              {room.currentPlayers}/{room.maxPlayers}
                            </span>
                          </div>
                          <Progress
                            value={
                              (room.currentPlayers / room.maxPlayers) * 100
                            }
                            color={getRoomStatusColor(room)}
                            className="h-2"
                          />
                        </div>

                        {/* Join button */}
                        <Button
                          color={isJoinable ? "primary" : "default"}
                          variant={isJoinable ? "solid" : "flat"}
                          size="sm"
                          className="w-full"
                          isDisabled={!isJoinable || joining !== null}
                          isLoading={joining === room.id}
                          onPress={() => handleJoinRoom(room.id)}
                        >
                          {!canJoin
                            ? "Opens Soon"
                            : room.status === "in_progress"
                              ? "Game in Progress"
                              : room.currentPlayers >= room.maxPlayers
                                ? "Room Full"
                                : "Join Room"}
                        </Button>
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Back button */}
          <div className="mt-8">
            <Button variant="light" onPress={() => router.push("/")}>
              ← Back to Home
            </Button>
          </div>
        </div>
      </main>
      <LobbyBottomBar isConnected={isConnected} />

      {/* Upgrade Modal - shown when free tier limit reached */}
      <Modal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        classNames={{
          base: "bg-gray-900 border border-gray-700",
          header: "border-b border-gray-700",
          body: "py-6",
          footer: "border-t border-gray-700",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span className="text-xl">Daily Limit Reached</span>
          </ModalHeader>
          <ModalBody>
            <div className="text-center">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-gray-300 mb-4">
                You&apos;ve played all {FREE_TIER_DAILY_SET_LIMIT} free sets for
                today!
              </p>
              <p className="text-gray-400 text-sm">
                Upgrade to{" "}
                <span className="text-primary-400 font-semibold">
                  Supporter
                </span>{" "}
                for unlimited quiz sets, plus exclusive badges and the patron
                leaderboard.
              </p>
            </div>
          </ModalBody>
          <ModalFooter className="flex flex-col gap-2">
            <Button
              color="primary"
              className="w-full"
              size="lg"
              onPress={() => router.push("/subscribe")}
            >
              View Plans - Starting at $3/month
            </Button>
            <Button
              variant="light"
              className="w-full"
              onPress={() => setShowUpgradeModal(false)}
            >
              Maybe Later
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </GameBackground>
  );
}

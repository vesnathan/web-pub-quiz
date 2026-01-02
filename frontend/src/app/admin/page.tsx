"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Divider,
  Select,
  SelectItem,
  Spinner,
  Input,
} from "@nextui-org/react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useLobbyChannel } from "@/hooks/useLobbyChannel";
import { useGameStore } from "@/stores/gameStore";
import { useSubscription } from "@/hooks/useSubscription";
import { adminUpdateUserTier, adminGiftSubscription } from "@/lib/api";
import type { RoomListItem } from "@quiz/shared";

const ADMIN_EMAIL = "vesnathan+qnl-admin@gmail.com";

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { rooms, isConnected, joinWindowOpen, secondsUntilJoinOpen } =
    useLobbyChannel();
  const { tierName, refreshSubscription } = useSubscription();
  const [selectedTier, setSelectedTier] = useState<string>("0");
  const [isUpdatingTier, setIsUpdatingTier] = useState(false);
  const [tierUpdateError, setTierUpdateError] = useState<string | null>(null);
  const [tierUpdateSuccess, setTierUpdateSuccess] = useState(false);

  // Gift subscription state
  const [giftUserId, setGiftUserId] = useState("");
  const [giftTier, setGiftTier] = useState<string>("1");
  const [giftDuration, setGiftDuration] = useState<string>("7");
  const [isGifting, setIsGifting] = useState(false);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftSuccess, setGiftSuccess] = useState<string | null>(null);

  const {
    isSetActive,
    nextSetTime,
    gamePhase,
    questionIndex,
    players,
    currentRoomId,
    currentRoomName,
  } = useGameStore();

  const handleTierChange = useCallback(
    async (tier: string) => {
      if (!user) return;

      setIsUpdatingTier(true);
      setTierUpdateError(null);
      setTierUpdateSuccess(false);

      try {
        await adminUpdateUserTier(user.userId, parseInt(tier, 10));

        setSelectedTier(tier);
        setTierUpdateSuccess(true);
        // Refresh subscription data
        await refreshSubscription();

        // Clear success message after 3 seconds
        setTimeout(() => setTierUpdateSuccess(false), 3000);
      } catch (error) {
        console.error("Error updating tier:", error);
        setTierUpdateError("Failed to update tier");
      } finally {
        setIsUpdatingTier(false);
      }
    },
    [user, refreshSubscription],
  );

  const handleGiftSubscription = useCallback(async () => {
    if (!giftUserId.trim()) {
      setGiftError("Please enter a user ID");
      return;
    }

    setIsGifting(true);
    setGiftError(null);
    setGiftSuccess(null);

    try {
      const giftedUser = await adminGiftSubscription({
        recipientUserId: giftUserId.trim(),
        tier: parseInt(giftTier, 10),
        durationDays: parseInt(giftDuration, 10),
      });

      if (giftedUser) {
        const tierName = giftTier === "1" ? "Supporter" : "Champion";
        const expiresDate = giftedUser.subscription?.giftExpiresAt
          ? new Date(giftedUser.subscription.giftExpiresAt).toLocaleDateString()
          : "N/A";
        setGiftSuccess(
          `Gifted ${tierName} subscription to ${giftedUser.displayName} until ${expiresDate}`,
        );
        setGiftUserId(""); // Clear the input
      }

      // Clear success message after 5 seconds
      setTimeout(() => setGiftSuccess(null), 5000);
    } catch (error) {
      console.error("Error gifting subscription:", error);
      setGiftError("Failed to gift subscription. Check user ID and try again.");
    } finally {
      setIsGifting(false);
    }
  }, [giftUserId, giftTier, giftDuration]);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  // Calculate time until next set
  const formatTimeUntil = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return "Now";
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  const totalPlayers = rooms.reduce((sum, r) => sum + r.currentPlayers, 0);
  const totalQueued = rooms.reduce((sum, r) => sum + (r.queuedPlayers || 0), 0);

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Admin Dashboard
          </h1>
          <Button
            variant="light"
            onPress={() => router.push("/")}
            className="text-gray-400"
          >
            Back to Home
          </Button>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatusCard
            title="Ably Connection"
            value={isConnected ? "Connected" : "Disconnected"}
            color={isConnected ? "success" : "danger"}
          />
          <StatusCard
            title="Join Window"
            value={
              joinWindowOpen
                ? "Open"
                : secondsUntilJoinOpen
                  ? `Opens in ${Math.floor(secondsUntilJoinOpen / 60)}:${(secondsUntilJoinOpen % 60).toString().padStart(2, "0")}`
                  : "Closed"
            }
            color={joinWindowOpen ? "success" : "warning"}
          />
          <StatusCard
            title="Set Status"
            value={isSetActive ? "LIVE" : "Break"}
            color={isSetActive ? "success" : "warning"}
          />
          <StatusCard
            title="Next Set"
            value={formatTimeUntil(nextSetTime)}
            color="primary"
          />
        </div>

        {/* Player Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusCard
            title="Total Rooms"
            value={rooms.length.toString()}
            color="default"
          />
          <StatusCard
            title="Total Players"
            value={totalPlayers.toString()}
            color="default"
          />
          <StatusCard
            title="Queued Players"
            value={totalQueued.toString()}
            color="secondary"
          />
        </div>

        {/* Rooms List */}
        <Card className="bg-gray-800/50">
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Active Rooms</h2>
            <Chip
              size="sm"
              variant="flat"
              color={isConnected ? "success" : "danger"}
            >
              {isConnected ? "Live" : "Offline"}
            </Chip>
          </CardHeader>
          <Divider />
          <CardBody>
            {rooms.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No rooms available. Rooms will be created when the join window
                opens.
              </div>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <RoomRow key={room.id} room={room} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Frontend State */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Frontend State</h2>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Game Phase</div>
                <div className="text-white font-medium">{gamePhase}</div>
              </div>
              <div>
                <div className="text-gray-400">Question Index</div>
                <div className="text-white font-medium">
                  {questionIndex + 1}/20
                </div>
              </div>
              <div>
                <div className="text-gray-400">Current Room</div>
                <div className="text-white font-medium">
                  {currentRoomName || currentRoomId || "None"}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Local Players</div>
                <div className="text-white font-medium">{players.length}</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Admin Testing */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">
              Subscription Testing
            </h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">Current Tier:</div>
              <Chip
                color={
                  tierName === "Champion"
                    ? "success"
                    : tierName === "Supporter"
                      ? "primary"
                      : "default"
                }
                variant="flat"
              >
                {tierName}
              </Chip>
            </div>

            <div className="flex items-center gap-4">
              <Select
                label="Change Tier"
                size="sm"
                className="max-w-xs"
                selectedKeys={[selectedTier]}
                onSelectionChange={(keys) => {
                  const tier = Array.from(keys)[0] as string;
                  if (tier) handleTierChange(tier);
                }}
                isDisabled={isUpdatingTier}
              >
                <SelectItem key="0" textValue="Free">
                  Free (Tier 0)
                </SelectItem>
                <SelectItem key="1" textValue="Supporter">
                  Supporter (Tier 1) - $3/mo
                </SelectItem>
                <SelectItem key="2" textValue="Champion">
                  Champion (Tier 2) - $10/mo
                </SelectItem>
              </Select>

              {isUpdatingTier && <Spinner size="sm" />}

              {tierUpdateSuccess && (
                <Chip color="success" variant="flat" size="sm">
                  Updated!
                </Chip>
              )}

              {tierUpdateError && (
                <Chip color="danger" variant="flat" size="sm">
                  {tierUpdateError}
                </Chip>
              )}
            </div>

            <p className="text-xs text-gray-500">
              Change your subscription tier to test features. This only affects
              your account.
            </p>
          </CardBody>
        </Card>

        {/* Gift Subscription */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">
              Gift Subscription
            </h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <p className="text-sm text-gray-400">
              Gift a subscription to a user. They will see a notification when
              they sign in.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="User ID"
                placeholder="Enter user ID (UUID)"
                value={giftUserId}
                onValueChange={setGiftUserId}
                size="sm"
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50",
                }}
              />

              <Select
                label="Tier"
                size="sm"
                selectedKeys={[giftTier]}
                onSelectionChange={(keys) => {
                  const tier = Array.from(keys)[0] as string;
                  if (tier) setGiftTier(tier);
                }}
                classNames={{
                  trigger: "bg-gray-700/50",
                }}
              >
                <SelectItem key="1" textValue="Supporter">
                  Supporter (Tier 1)
                </SelectItem>
                <SelectItem key="2" textValue="Champion">
                  Champion (Tier 2)
                </SelectItem>
              </Select>

              <Select
                label="Duration"
                size="sm"
                selectedKeys={[giftDuration]}
                onSelectionChange={(keys) => {
                  const duration = Array.from(keys)[0] as string;
                  if (duration) setGiftDuration(duration);
                }}
                classNames={{
                  trigger: "bg-gray-700/50",
                }}
              >
                <SelectItem key="7" textValue="1 Week">
                  1 Week
                </SelectItem>
                <SelectItem key="30" textValue="1 Month">
                  1 Month
                </SelectItem>
                <SelectItem key="90" textValue="3 Months">
                  3 Months
                </SelectItem>
                <SelectItem key="180" textValue="6 Months">
                  6 Months
                </SelectItem>
                <SelectItem key="365" textValue="1 Year">
                  1 Year
                </SelectItem>
              </Select>
            </div>

            <div className="flex items-center gap-4">
              <Button
                color="success"
                variant="solid"
                onPress={handleGiftSubscription}
                isLoading={isGifting}
                isDisabled={!giftUserId.trim()}
              >
                Gift Subscription
              </Button>

              {giftSuccess && (
                <Chip color="success" variant="flat" size="sm">
                  {giftSuccess}
                </Chip>
              )}

              {giftError && (
                <Chip color="danger" variant="flat" size="sm">
                  {giftError}
                </Chip>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Instructions */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">
              Monitoring Tools
            </h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-3 text-sm text-gray-300">
            <p>
              <strong className="text-primary-400">Ably Dashboard:</strong> View
              real-time message stats at{" "}
              <a
                href="https://ably.com/accounts"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 underline"
              >
                ably.com/accounts
              </a>
            </p>
            <p>
              <strong className="text-primary-400">CloudWatch Logs:</strong>{" "}
              Orchestrator logs are in the{" "}
              <code className="bg-gray-700 px-1 rounded">
                /ecs/qnl-orchestrator-prod
              </code>{" "}
              log group in ap-southeast-2.
            </p>
            <p>
              <strong className="text-primary-400">Browser DevTools:</strong>{" "}
              Check Network tab for WebSocket connections, Console for errors.
            </p>
          </CardBody>
        </Card>

        {/* Admin Links */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Admin Tools</h2>
          </CardHeader>
          <Divider />
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Button
                color="primary"
                variant="flat"
                onPress={() => router.push("/admin/webhooks")}
              >
                Webhook Logs
              </Button>
              <Button
                color="secondary"
                variant="flat"
                onPress={() => router.push("/admin/badge-test")}
              >
                Badge Test Mode
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  value: string;
  color: "success" | "danger" | "warning" | "primary" | "secondary" | "default";
}

function StatusCard({ title, value, color }: StatusCardProps) {
  return (
    <Card className="bg-gray-800/50">
      <CardBody className="p-4">
        <div className="text-sm text-gray-400 mb-1">{title}</div>
        <Chip color={color} variant="flat" className="font-bold">
          {value}
        </Chip>
      </CardBody>
    </Card>
  );
}

interface RoomRowProps {
  room: RoomListItem;
}

function RoomRow({ room }: RoomRowProps) {
  const getStatusColor = () => {
    if (room.status === "in_progress") return "warning";
    if (room.currentPlayers >= room.maxPlayers) return "danger";
    return "success";
  };

  const getStatusText = () => {
    if (room.status === "in_progress") return "In Progress";
    if (room.currentPlayers >= room.maxPlayers) return "Full";
    return "Waiting";
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
      <div className="flex items-center gap-4">
        <div>
          <div className="font-medium text-white">{room.name}</div>
          <div className="text-xs text-gray-400">
            ID: {room.id.slice(0, 8)}...
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm text-white">
            {room.currentPlayers}/{room.maxPlayers} players
          </div>
          {room.queuedPlayers > 0 && (
            <div className="text-xs text-purple-400">
              +{room.queuedPlayers} queued
            </div>
          )}
        </div>
        <Chip color={getStatusColor()} variant="flat" size="sm">
          {getStatusText()}
        </Chip>
      </div>
    </div>
  );
}

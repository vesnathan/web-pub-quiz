'use client';

import { useState, useEffect } from 'react';
import { Card, CardBody, Button, Progress, Chip, CircularProgress } from '@nextui-org/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useGameStore } from '@/stores/gameStore';
import { useLobbyChannel } from '@/hooks/useLobbyChannel';
import { useNotifications, useCountdownNotifications } from '@/hooks/useNotifications';
import { DID_YOU_KNOW_FACTS } from '@/data/didYouKnowFacts';
import { LoadingDots } from '@/components/LoadingScreen';
import { MAX_PLAYERS_PER_ROOM } from '@quiz/shared';
import type { RoomListItem } from '@quiz/shared';

interface RoomListProps {
  onJoinRoom?: (roomId: string) => void;
}

export function RoomList({ onJoinRoom }: RoomListProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { setPlayer, setCurrentRoomId } = useGameStore();
  const { nextSetTime } = useGameStore();
  const { rooms, isConnected, joinWindowOpen, secondsUntilJoinOpen, joinRoom, queueJoin, queueLeave } = useLobbyChannel();
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Notification state
  const {
    notificationsEnabled,
    permissionState,
    requestPermission,
    disableNotifications,
    enableNotifications,
    sendNotification,
  } = useNotifications();

  // Set up countdown notifications - notify when join window opens
  const { checkNotifications } = useCountdownNotifications(
    nextSetTime,
    false, // not active (we're in lobby waiting)
    notificationsEnabled,
    sendNotification
  );

  // Random facts state
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * DID_YOU_KNOW_FACTS.length));
  const [factFading, setFactFading] = useState(false);

  // Use server-provided join window status
  const canJoin = joinWindowOpen;

  // Rotate facts every 12 seconds when waiting for join window
  useEffect(() => {
    if (canJoin) return; // Don't rotate when join window is open

    const rotateFact = () => {
      setFactFading(true);
      setTimeout(() => {
        setFactIndex((prev) => (prev + 1) % DID_YOU_KNOW_FACTS.length);
        setFactFading(false);
      }, 300);
    };

    const interval = setInterval(rotateFact, 12000);
    return () => clearInterval(interval);
  }, [canJoin]);

  const handleJoinRoom = async (roomId: string) => {
    // If not authenticated, call onJoinRoom callback (e.g., to show login modal)
    if (!user) {
      if (onJoinRoom) {
        onJoinRoom(roomId);
      }
      return;
    }

    if (!canJoin) return;

    setJoining(roomId);
    setError(null);

    const result = await joinRoom(roomId);

    if (result.success && result.roomId) {
      setPlayer({
        id: user.userId,
        displayName: user.name || user.email.split('@')[0],
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
      setError(result.error || 'Failed to join room');
      setJoining(null);
    }
  };

  // Format time as mm:ss
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage (for 29 min countdown to join window)
  // Progress shrinks from 100% to 0% as time runs out
  const maxWaitSeconds = 29 * 60; // 29 minutes max wait
  const progressValue = canJoin ? 0 : Math.min(100, ((secondsUntilJoinOpen || 0) / maxWaitSeconds) * 100);

  return (
    <Card className="bg-gray-900/70 backdrop-blur-sm">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Quiz Rooms</h2>
          <Chip color={isConnected ? 'success' : 'default'} variant="flat" size="sm">
            {isConnected ? 'Live' : 'Connecting...'}
          </Chip>
        </div>

        {/* Join Window Timer */}
        {!canJoin && secondsUntilJoinOpen !== null && (
          <div className="flex flex-col items-center mb-6">
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
              <div className="text-sm text-gray-400">until rooms open</div>
            </div>

            {/* Did you know? facts */}
            <div className="mt-4 px-2 w-full">
              <div className="text-xs text-gray-500 mb-1 text-center">Did you know?</div>
              <div
                className={`text-sm text-gray-300 italic text-center transition-opacity duration-300 ${
                  factFading ? 'opacity-0' : 'opacity-100'
                }`}
              >
                {DID_YOU_KNOW_FACTS[factIndex].text}
              </div>
              <div className="text-center mt-2">
                <a
                  href={DID_YOU_KNOW_FACTS[factIndex].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary-400 hover:text-primary-300 hover:underline"
                >
                  Source: {DID_YOU_KNOW_FACTS[factIndex].source} →
                </a>
              </div>
            </div>

            {/* Notification Toggle */}
            <div className="mt-4 flex justify-center">
              {permissionState === 'denied' ? (
                <div className="text-sm text-gray-500">
                  Notifications blocked (check browser settings)
                </div>
              ) : permissionState === 'granted' ? (
                <Button
                  size="sm"
                  variant="flat"
                  onPress={notificationsEnabled ? disableNotifications : enableNotifications}
                  className="text-sm"
                >
                  {notificationsEnabled ? '🔔 Notifications on' : '🔕 Notifications off'}
                </Button>
              ) : permissionState !== 'unsupported' ? (
                <Button
                  size="sm"
                  variant="flat"
                  onPress={requestPermission}
                  className="text-sm"
                >
                  🔔 Notify me when it starts
                </Button>
              ) : null}
            </div>
          </div>
        )}

        {canJoin && (
          <div className="bg-success-100/20 text-success-500 px-3 py-2 rounded-lg mb-4 text-sm text-center">
            Select a room to join the quiz!
          </div>
        )}

        {error && (
          <div className="bg-danger-100 text-danger-700 px-3 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Room List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <LoadingDots />
              <span className="text-gray-400 text-sm">Connecting...</span>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No rooms available</p>
              <p className="text-sm mt-1">
                {canJoin ? 'Rooms will appear shortly' : 'Rooms will appear when join opens'}
              </p>
            </div>
          ) : (
            rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                canJoin={canJoin}
                joining={joining}
                onJoin={handleJoinRoom}
                onQueueJoin={queueJoin}
                onQueueLeave={queueLeave}
                isAuthenticated={!!user}
                secondsUntilJoinOpen={secondsUntilJoinOpen}
                formatTime={formatTime}
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
  canJoin: boolean;
  joining: string | null;
  onJoin: (roomId: string) => void;
  onQueueJoin: (roomId: string) => Promise<{ success: boolean; queuePosition?: number }>;
  onQueueLeave: (roomId: string) => Promise<{ success: boolean }>;
  isAuthenticated: boolean;
  secondsUntilJoinOpen: number | null;
  formatTime: (seconds: number) => string;
}

function RoomCard({ room, canJoin, joining, onJoin, onQueueJoin, onQueueLeave, isAuthenticated, secondsUntilJoinOpen, formatTime }: RoomCardProps) {
  const [isQueued, setIsQueued] = useState(false);

  const getRoomStatusColor = (room: RoomListItem): 'success' | 'warning' | 'danger' | 'default' => {
    if (room.status === 'in_progress') return 'warning';
    if (room.currentPlayers >= room.maxPlayers) return 'danger';
    if (room.currentPlayers > room.maxPlayers * 0.7) return 'warning';
    return 'success';
  };

  // Room is joinable if: join window open, room waiting, not full, and user is authenticated
  const isJoinable = canJoin && room.status === 'waiting' && room.currentPlayers < room.maxPlayers;
  // For unauthenticated users, clicking will open login modal
  const canClickJoin = isAuthenticated ? isJoinable : (room.status === 'waiting' && room.currentPlayers < room.maxPlayers);
  // Can enable auto-join if: authenticated, window not open yet, room is waiting and not full
  const canEnableAutoJoin = isAuthenticated && !canJoin && room.status === 'waiting' && room.currentPlayers < room.maxPlayers;

  // Auto-join when window opens (if queued)
  useEffect(() => {
    if (isQueued && canJoin && room.status === 'waiting' && room.currentPlayers < room.maxPlayers) {
      onJoin(room.id);
      setIsQueued(false);
    }
  }, [isQueued, canJoin, room.status, room.currentPlayers, room.maxPlayers, room.id, onJoin]);

  const getButtonText = () => {
    if (!isAuthenticated) {
      if (room.status === 'in_progress') return 'In Progress';
      if (room.currentPlayers >= room.maxPlayers) return 'Full';
      return 'Sign in to Join';
    }
    if (isQueued) {
      return secondsUntilJoinOpen ? `Joining in ${formatTime(secondsUntilJoinOpen)}` : 'Joining soon...';
    }
    if (!canJoin) {
      if (room.status === 'in_progress') return 'In Progress';
      if (room.currentPlayers >= room.maxPlayers) return 'Full';
      return 'Join when open';
    }
    if (room.status === 'in_progress') return 'In Progress';
    if (room.currentPlayers >= room.maxPlayers) return 'Full';
    return 'Join';
  };

  const handleButtonClick = async () => {
    if (canEnableAutoJoin && !isQueued) {
      const result = await onQueueJoin(room.id);
      if (result.success) {
        setIsQueued(true);
      }
    } else if (isQueued) {
      await onQueueLeave(room.id);
      setIsQueued(false);
    } else {
      onJoin(room.id);
    }
  };

  // Determine if button should be clickable
  const isButtonDisabled = () => {
    if (joining !== null) return true;
    if (!isAuthenticated) return !canClickJoin;
    if (room.status === 'in_progress') return true;
    if (room.currentPlayers >= room.maxPlayers) return true;
    return false;
  };

  // Show queued players if window is not open and there are people queued
  const showQueuedCount = !canJoin && room.queuedPlayers > 0;

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 hover:bg-gray-700/50 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium">{room.name}</span>
        {room.status === 'in_progress' ? (
          <Chip color="warning" variant="flat" size="sm">
            In Progress
          </Chip>
        ) : room.currentPlayers >= room.maxPlayers ? (
          <Chip color="danger" variant="flat" size="sm">
            Full
          </Chip>
        ) : (
          <Chip color="success" variant="flat" size="sm">
            Waiting
          </Chip>
        )}
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{showQueuedCount ? 'Queued' : 'Players'}</span>
          <span>{showQueuedCount ? room.queuedPlayers : `${room.currentPlayers}/${room.maxPlayers}`}</span>
        </div>
        {showQueuedCount ? (
          <Progress
            value={(room.queuedPlayers / room.maxPlayers) * 100}
            color="secondary"
            size="sm"
            className="h-1"
          />
        ) : (
          <Progress
            value={(room.currentPlayers / room.maxPlayers) * 100}
            color={getRoomStatusColor(room)}
            size="sm"
            className="h-1"
          />
        )}
      </div>

      <Button
        color={isQueued ? 'secondary' : (canClickJoin || canEnableAutoJoin) ? 'primary' : 'default'}
        variant={isQueued ? 'solid' : 'flat'}
        size="sm"
        className="w-full"
        isDisabled={isButtonDisabled()}
        isLoading={joining === room.id}
        onPress={handleButtonClick}
      >
        {getButtonText()}
      </Button>
    </div>
  );
}

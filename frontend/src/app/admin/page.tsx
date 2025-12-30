'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Button,
  Divider,
} from '@nextui-org/react';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useAuth } from '@/contexts/AuthContext';
import { useLobbyChannel } from '@/hooks/useLobbyChannel';
import { useGameStore } from '@/stores/gameStore';
import type { RoomListItem } from '@quiz/shared';

const ADMIN_EMAIL = 'vesnathan+wpq-admin@gmail.com';

export default function AdminPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { rooms, isConnected, joinWindowOpen, secondsUntilJoinOpen } = useLobbyChannel();
  const [ablyMessages, setAblyMessages] = useState<{ time: string; event: string; data: string }[]>([]);

  const {
    isSetActive,
    nextSetTime,
    gamePhase,
    questionIndex,
    players,
    currentRoomId,
    currentRoomName,
  } = useGameStore();

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  // Calculate time until next set
  const formatTimeUntil = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Now';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
          <h1 className="text-2xl md:text-3xl font-bold text-white">Admin Dashboard</h1>
          <Button
            variant="light"
            onPress={() => router.push('/')}
            className="text-gray-400"
          >
            Back to Home
          </Button>
        </div>

        {/* Connection Status */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatusCard
            title="Ably Connection"
            value={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'danger'}
          />
          <StatusCard
            title="Join Window"
            value={joinWindowOpen ? 'Open' : secondsUntilJoinOpen ? `Opens in ${Math.floor(secondsUntilJoinOpen / 60)}:${(secondsUntilJoinOpen % 60).toString().padStart(2, '0')}` : 'Closed'}
            color={joinWindowOpen ? 'success' : 'warning'}
          />
          <StatusCard
            title="Set Status"
            value={isSetActive ? 'LIVE' : 'Break'}
            color={isSetActive ? 'success' : 'warning'}
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
            <Chip size="sm" variant="flat" color={isConnected ? 'success' : 'danger'}>
              {isConnected ? 'Live' : 'Offline'}
            </Chip>
          </CardHeader>
          <Divider />
          <CardBody>
            {rooms.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                No rooms available. Rooms will be created when the join window opens.
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
                <div className="text-white font-medium">{questionIndex + 1}/20</div>
              </div>
              <div>
                <div className="text-gray-400">Current Room</div>
                <div className="text-white font-medium">{currentRoomName || currentRoomId || 'None'}</div>
              </div>
              <div>
                <div className="text-gray-400">Local Players</div>
                <div className="text-white font-medium">{players.length}</div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Instructions */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Monitoring Tools</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-3 text-sm text-gray-300">
            <p>
              <strong className="text-primary-400">Ably Dashboard:</strong>{' '}
              View real-time message stats at{' '}
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
              <strong className="text-primary-400">CloudWatch Logs:</strong>{' '}
              Orchestrator logs are in the{' '}
              <code className="bg-gray-700 px-1 rounded">/ecs/wpq-orchestrator-prod</code>{' '}
              log group in ap-southeast-2.
            </p>
            <p>
              <strong className="text-primary-400">Browser DevTools:</strong>{' '}
              Check Network tab for WebSocket connections, Console for errors.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  value: string;
  color: 'success' | 'danger' | 'warning' | 'primary' | 'secondary' | 'default';
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
    if (room.status === 'in_progress') return 'warning';
    if (room.currentPlayers >= room.maxPlayers) return 'danger';
    return 'success';
  };

  const getStatusText = () => {
    if (room.status === 'in_progress') return 'In Progress';
    if (room.currentPlayers >= room.maxPlayers) return 'Full';
    return 'Waiting';
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
      <div className="flex items-center gap-4">
        <div>
          <div className="font-medium text-white">{room.name}</div>
          <div className="text-xs text-gray-400">ID: {room.id.slice(0, 8)}...</div>
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

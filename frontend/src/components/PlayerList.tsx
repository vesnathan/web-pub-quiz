"use client";

import { Card, CardBody, Avatar } from "@nextui-org/react";
import type { Player } from "@quiz/shared";

interface PlayerListProps {
  players: Player[];
  scores: Record<string, number>;
  currentPlayerId: string;
  buzzerWinnerId: string | null;
}

export function PlayerList({
  players,
  scores,
  currentPlayerId,
  buzzerWinnerId,
}: PlayerListProps) {
  // Sort players by score
  const sortedPlayers = [...players].sort(
    (a, b) => (scores[b.id] || 0) - (scores[a.id] || 0),
  );

  return (
    <Card className="bg-gray-800/50 backdrop-blur">
      <CardBody className="p-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          Players ({players.length})
        </h3>

        <div className="space-y-2">
          {sortedPlayers.map((player, index) => {
            const score = scores[player.id] || 0;
            const isCurrentPlayer = player.id === currentPlayerId;
            const isBuzzerWinner = player.id === buzzerWinnerId;

            return (
              <div
                key={player.id}
                className={`
                  flex items-center justify-between p-2 rounded-lg
                  transition-all duration-200
                  ${isCurrentPlayer ? "bg-primary-900/50 border border-primary-500" : ""}
                  ${isBuzzerWinner ? "bg-blue-900/50 animate-pulse" : ""}
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-gray-500 w-4 text-sm">{index + 1}</span>
                  <Avatar
                    name={player.displayName}
                    size="sm"
                    className="bg-gray-700"
                  />
                  <div>
                    <div className="text-sm font-medium text-white">
                      {player.displayName}
                      {player.isAI && (
                        <span className="ml-1 text-xs text-gray-500">(AI)</span>
                      )}
                    </div>
                    {isCurrentPlayer && (
                      <div className="text-xs text-primary-400">You</div>
                    )}
                  </div>
                </div>

                <div
                  className={`
                    font-bold text-sm
                    ${score >= 0 ? "text-green-400" : "text-red-400"}
                  `}
                >
                  {score >= 0 ? "+" : ""}
                  {score}
                </div>
              </div>
            );
          })}

          {players.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Waiting for players...
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

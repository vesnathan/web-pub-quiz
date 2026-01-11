"use client";

import { useState } from "react";
import { Card, CardBody, Avatar } from "@nextui-org/react";
import { ReportUserModal } from "@/components/ReportUserModal";
import type { Player } from "@quiz/shared";

interface PlayerListProps {
  players: Player[];
  scores: Record<string, number>;
  currentPlayerId: string;
  questionWinnerId: string | null;
}

export function PlayerList({
  players,
  scores,
  currentPlayerId,
  questionWinnerId,
}: PlayerListProps) {
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    id: string;
    displayName: string;
  } | null>(null);

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
            const isQuestionWinner = player.id === questionWinnerId;

            return (
              <div
                key={player.id}
                className={`
                  group flex items-center justify-between p-2 rounded-lg
                  transition-all duration-200
                  ${isCurrentPlayer ? "bg-primary-900/50 border border-primary-500" : ""}
                  ${isQuestionWinner ? "bg-green-900/50 border border-green-500" : ""}
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

                <div className="flex items-center gap-2">
                  {!isCurrentPlayer && !player.isAI && (
                    <button
                      onClick={() => {
                        setReportTarget({
                          id: player.id,
                          displayName: player.displayName,
                        });
                        setReportModalOpen(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-red-500"
                      title="Report player"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                        />
                      </svg>
                    </button>
                  )}
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
              </div>
            );
          })}

          {players.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Waiting for players...
            </div>
          )}
        </div>

        {/* Report Modal */}
        {reportTarget && (
          <ReportUserModal
            isOpen={reportModalOpen}
            onClose={() => {
              setReportModalOpen(false);
              setReportTarget(null);
            }}
            targetUser={reportTarget}
            context="AVATAR"
          />
        )}
      </CardBody>
    </Card>
  );
}

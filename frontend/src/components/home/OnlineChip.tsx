"use client";

import { Chip } from "@nextui-org/react";

interface OnlineChipProps {
  isConnected: boolean;
  activeUserCount: number;
}

export function OnlineChip({ isConnected, activeUserCount }: OnlineChipProps) {
  return (
    <Chip
      color={isConnected && activeUserCount > 0 ? "success" : "default"}
      variant="flat"
      size="sm"
    >
      {isConnected
        ? `${activeUserCount} ${activeUserCount === 1 ? "player" : "players"} online`
        : "Connecting..."}
    </Chip>
  );
}

/**
 * TanStack Query hook for leaderboard data
 */
import { useQuery } from "@tanstack/react-query";
import { getLeaderboard } from "@/lib/api";
import type { LeaderboardType } from "@quiz/shared";

export const leaderboardKeys = {
  all: ["leaderboard"] as const,
  byType: (type: LeaderboardType) => [...leaderboardKeys.all, type] as const,
};

export function useLeaderboard(type: LeaderboardType, limit = 10) {
  return useQuery({
    queryKey: leaderboardKeys.byType(type),
    queryFn: () => getLeaderboard(type, limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

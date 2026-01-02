/**
 * TanStack Query hook for Ably authentication token
 */
import { useQuery } from "@tanstack/react-query";
import { getAblyToken } from "@/lib/api";

export const ablyTokenKeys = {
  all: ["ablyToken"] as const,
};

/**
 * Hook to fetch Ably authentication token
 * Token is refreshed before expiry
 */
export function useAblyToken(enabled = true) {
  return useQuery({
    queryKey: ablyTokenKeys.all,
    queryFn: getAblyToken,
    enabled,
    staleTime: 50 * 60 * 1000, // 50 minutes (tokens last ~60 min)
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 50 * 60 * 1000, // Refresh every 50 minutes
    retry: 3,
  });
}

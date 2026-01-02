/**
 * TanStack Query hook for user conversations
 */
import { useQuery } from "@tanstack/react-query";
import { getMyConversations } from "@/lib/api";

export const conversationsKeys = {
  all: ["conversations"] as const,
  list: (limit?: number) => [...conversationsKeys.all, "list", limit] as const,
};

/**
 * Hook to fetch the current user's conversations
 */
export function useConversations(limit = 20, enabled = true) {
  return useQuery({
    queryKey: conversationsKeys.list(limit),
    queryFn: () => getMyConversations(limit),
    enabled,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

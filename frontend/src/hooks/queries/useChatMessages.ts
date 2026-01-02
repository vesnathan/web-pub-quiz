/**
 * TanStack Query hook for chat messages
 */
import { useQuery } from "@tanstack/react-query";
import { getChatMessages } from "@/lib/api";

export const chatMessagesKeys = {
  all: ["chatMessages"] as const,
  byChannel: (channelId: string) =>
    [...chatMessagesKeys.all, channelId] as const,
};

/**
 * Hook to fetch chat messages for a channel
 */
export function useChatMessages(channelId: string, limit = 50, enabled = true) {
  return useQuery({
    queryKey: chatMessagesKeys.byChannel(channelId),
    queryFn: () => getChatMessages(channelId, limit),
    enabled: enabled && !!channelId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: false, // Use subscription for real-time updates instead
  });
}

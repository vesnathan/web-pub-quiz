/**
 * TanStack Query hook for webhook logs (admin only)
 */
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { getWebhookLogs } from "@/lib/api";

export const webhookLogsKeys = {
  all: ["webhookLogs"] as const,
  list: (provider?: string | null) =>
    [...webhookLogsKeys.all, provider ?? "all"] as const,
};

/**
 * Hook to fetch webhook logs with infinite scrolling support
 */
export function useWebhookLogs(provider?: string | null, enabled = true) {
  return useInfiniteQuery({
    queryKey: webhookLogsKeys.list(provider),
    queryFn: ({ pageParam }) =>
      getWebhookLogs({
        provider: provider === "all" ? null : provider,
        limit: 50,
        nextToken: pageParam,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextToken,
    enabled,
    staleTime: 30 * 1000, // 30 seconds
  });
}

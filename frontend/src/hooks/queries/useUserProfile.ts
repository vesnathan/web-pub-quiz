/**
 * TanStack Query hook for user profile data
 */
import { useQuery } from "@tanstack/react-query";
import { getMyProfile } from "@/lib/api";

export const userProfileKeys = {
  all: ["userProfile"] as const,
  me: () => [...userProfileKeys.all, "me"] as const,
};

/**
 * Hook to fetch the current user's profile
 * Used by AuthContext and useSubscription for profile data
 */
export function useUserProfile(enabled = true) {
  return useQuery({
    queryKey: userProfileKeys.me(),
    queryFn: getMyProfile,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

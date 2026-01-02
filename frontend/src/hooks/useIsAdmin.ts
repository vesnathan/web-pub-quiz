import { useState, useEffect, useCallback } from "react";
import { fetchAuthSession } from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";

interface AdminStatus {
  isAdmin: boolean;
  isLoading: boolean;
}

/**
 * Hook to check if the current user is a site administrator.
 * Checks for "SiteAdmin" group membership in Cognito JWT token.
 */
export function useIsAdmin(): AdminStatus {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({
    isAdmin: false,
    isLoading: true,
  });

  const checkAdminStatus = useCallback(async () => {
    try {
      const session = await fetchAuthSession({ forceRefresh: false });
      const groups = session.tokens?.accessToken?.payload["cognito:groups"] as
        | string[]
        | undefined;
      const isAdmin = groups?.includes("SiteAdmin") ?? false;
      setAdminStatus({ isAdmin, isLoading: false });
    } catch {
      // Not authenticated or error - not admin
      setAdminStatus({ isAdmin: false, isLoading: false });
    }
  }, []);

  useEffect(() => {
    // Check on mount
    checkAdminStatus();

    // Listen for auth events to re-check admin status
    const hubListener = Hub.listen("auth", ({ payload }) => {
      switch (payload.event) {
        case "signedIn":
        case "tokenRefresh":
          checkAdminStatus();
          break;
        case "signedOut":
          setAdminStatus({ isAdmin: false, isLoading: false });
          break;
      }
    });

    return () => hubListener();
  }, [checkAdminStatus]);

  return adminStatus;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { LoadingScreen } from "@/components/LoadingScreen";

interface RequireAdminProps {
  children: React.ReactNode;
}

/**
 * Component that protects its children from non-admin users.
 * Redirects to home page if user is not an admin.
 */
export function RequireAdmin({ children }: RequireAdminProps) {
  const { isAdmin, isLoading } = useIsAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.push("/");
    }
  }, [isLoading, isAdmin, router]);

  if (isLoading) {
    return <LoadingScreen message="Checking permissions..." />;
  }

  if (!isAdmin) {
    return <LoadingScreen message="Redirecting..." />;
  }

  return <>{children}</>;
}

"use client";

import { NextUIProvider } from "@nextui-org/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useState } from "react";
import { configureAmplify } from "@/lib/amplify";
import { AuthProvider } from "@/contexts/AuthContext";
import { ModerationModals } from "@/components/ModerationModals";

// Configure Amplify on module load
if (typeof window !== "undefined") {
  configureAmplify();
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NextUIProvider>
          <NextThemesProvider attribute="class" defaultTheme="dark">
            {children}
            <ModerationModals />
          </NextThemesProvider>
        </NextUIProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

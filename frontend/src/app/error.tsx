"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@nextui-org/react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="text-6xl">😕</div>
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="text-gray-400">
          We've been notified and are looking into it. Please try again.
        </p>
        <div className="space-y-3">
          <Button color="primary" className="w-full" onPress={() => reset()}>
            Try again
          </Button>
          <Button
            variant="flat"
            className="w-full"
            onPress={() => (window.location.href = "/")}
          >
            Return to Home
          </Button>
        </div>
        {error.digest && (
          <p className="text-xs text-gray-500">Error ID: {error.digest}</p>
        )}
      </div>
    </div>
  );
}

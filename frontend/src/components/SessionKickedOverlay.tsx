"use client";

import { motion } from "framer-motion";
import { Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";

export function SessionKickedOverlay() {
  const router = useRouter();
  const sessionKicked = useGameStore((state) => state.sessionKicked);
  const sessionKickedReason = useGameStore(
    (state) => state.sessionKickedReason,
  );
  const setSessionKicked = useGameStore((state) => state.setSessionKicked);

  if (!sessionKicked) {
    return null;
  }

  const handleReconnect = () => {
    // Clear the kicked state and reload the page to reconnect
    setSessionKicked(false);
    window.location.reload();
  };

  const handleGoHome = () => {
    setSessionKicked(false);
    router.push("/");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-w-md mx-4 p-8 bg-gray-900 rounded-xl border border-red-500/50 shadow-2xl text-center"
      >
        <div className="text-6xl mb-4">
          <span role="img" aria-label="warning">
            &#x26A0;&#xFE0F;
          </span>
        </div>

        <h2 className="text-2xl font-bold text-red-400 mb-4">
          Session Disconnected
        </h2>

        <p className="text-gray-300 mb-6">
          {sessionKickedReason ||
            "Your session was ended because you logged in from another location."}
        </p>

        <p className="text-gray-500 text-sm mb-8">
          Only one active session is allowed per account.
        </p>

        <div className="flex flex-col gap-3">
          <Button
            color="primary"
            size="lg"
            onPress={handleReconnect}
            className="font-semibold"
          >
            Reconnect Here
          </Button>

          <Button
            variant="ghost"
            onPress={handleGoHome}
            className="text-gray-400"
          >
            Return to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

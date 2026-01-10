"use client";

import { motion } from "framer-motion";
import { Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/gameStore";
import { useState } from "react";
import { AuthModal } from "./auth";

export function QuotaExceededOverlay() {
  const router = useRouter();
  const quotaExceeded = useGameStore((state) => state.quotaExceeded);
  const quotaExceededMessage = useGameStore(
    (state) => state.quotaExceededMessage,
  );
  const setQuotaExceeded = useGameStore((state) => state.setQuotaExceeded);
  const resetGame = useGameStore((state) => state.resetGame);
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (!quotaExceeded) {
    return null;
  }

  const handleSignUp = () => {
    setShowAuthModal(true);
  };

  const handleGoHome = () => {
    setQuotaExceeded(false);
    resetGame();
    router.push("/");
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    setQuotaExceeded(false);
    // Reload to reconnect with authenticated session
    window.location.reload();
  };

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md mx-4 p-8 bg-gray-900 rounded-xl border border-amber-500/50 shadow-2xl text-center"
        >
          <div className="text-6xl mb-4">
            <span role="img" aria-label="hourglass">
              &#x23F3;
            </span>
          </div>

          <h2 className="text-2xl font-bold text-amber-400 mb-4">
            Daily Limit Reached
          </h2>

          <p className="text-gray-300 mb-6">
            {quotaExceededMessage ||
              "You've used your 50 free questions for today!"}
          </p>

          <p className="text-gray-500 text-sm mb-8">
            Create a free account to track your progress and get unlimited
            questions.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              color="primary"
              size="lg"
              onPress={handleSignUp}
              className="font-semibold"
            >
              Sign Up Free
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

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode="register"
      />
    </>
  );
}

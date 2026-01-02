"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@nextui-org/react";
import { motion, AnimatePresence } from "framer-motion";
import { markGiftNotificationSeen } from "@/lib/api";

interface GiftSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  giftedByName: string | null;
  giftTier: number;
  giftExpiresAt: string | null;
  isWelcomeGift: boolean;
}

const TIER_NAMES: Record<number, string> = {
  1: "Supporter",
  2: "Champion",
};

const TIER_COLORS: Record<number, string> = {
  1: "from-purple-500 to-indigo-600",
  2: "from-amber-500 to-orange-600",
};

export function GiftSubscriptionModal({
  isOpen,
  onClose,
  giftedByName,
  giftTier,
  giftExpiresAt,
  isWelcomeGift,
}: GiftSubscriptionModalProps) {
  const [isMarking, setIsMarking] = useState(false);

  const tierName = TIER_NAMES[giftTier] || "Premium";
  const tierColor = TIER_COLORS[giftTier] || "from-gray-500 to-gray-600";

  // Format expiration date
  const expiresDate = giftExpiresAt
    ? new Date(giftExpiresAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleDismiss = useCallback(async () => {
    setIsMarking(true);
    try {
      await markGiftNotificationSeen();
      onClose();
    } catch (error) {
      console.error("Error marking gift notification seen:", error);
      // Still close on error - we don't want to trap the user
      onClose();
    } finally {
      setIsMarking(false);
    }
  }, [onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleDismiss}
      size="md"
      classNames={{
        base: "bg-gray-900 border border-gray-700",
        header: "border-b border-gray-700",
        body: "py-6",
        footer: "border-t border-gray-700",
      }}
      hideCloseButton
      isDismissable={false}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col items-center gap-1 pt-8">
          {/* Animated gift icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="text-6xl mb-2"
          >
            {isWelcomeGift ? "🎉" : "🎁"}
          </motion.div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`text-2xl font-bold bg-gradient-to-r ${tierColor} bg-clip-text text-transparent`}
          >
            {isWelcomeGift ? "Welcome Gift!" : "Gift Received!"}
          </motion.span>
        </ModalHeader>

        <ModalBody>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center space-y-4"
          >
            {isWelcomeGift ? (
              <p className="text-gray-300">
                Welcome to Quiz Night Live! As a thank you for joining,
                you&apos;ve received a
              </p>
            ) : (
              <p className="text-gray-300">
                {giftedByName || "Someone"} has gifted you a
              </p>
            )}

            {/* Tier badge */}
            <div
              className={`inline-block px-6 py-3 rounded-xl bg-gradient-to-r ${tierColor} shadow-lg`}
            >
              <span className="text-xl font-bold text-white">
                {tierName} Subscription
              </span>
            </div>

            {expiresDate && (
              <p className="text-gray-400 text-sm">
                Valid until{" "}
                <span className="text-white font-semibold">{expiresDate}</span>
              </p>
            )}

            {/* Benefits preview */}
            <div className="bg-gray-800/50 rounded-lg p-4 text-left mt-4">
              <p className="text-sm text-gray-400 mb-2">
                Your benefits include:
              </p>
              <ul className="text-sm text-gray-300 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Unlimited quiz sets
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Patron badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span> Patron leaderboard
                  access
                </li>
                {giftTier >= 2 && (
                  <>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Ad-free
                      experience
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-400">✓</span> Private rooms
                    </li>
                  </>
                )}
              </ul>
            </div>
          </motion.div>
        </ModalBody>

        <ModalFooter className="flex justify-center pb-6">
          <Button
            color="primary"
            size="lg"
            className="font-semibold px-8"
            onPress={handleDismiss}
            isLoading={isMarking}
          >
            {isWelcomeGift ? "Start Playing!" : "Awesome, Thanks!"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

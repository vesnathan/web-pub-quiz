"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Chip,
} from "@nextui-org/react";
import type { StrikeInfo } from "@/contexts/AuthContext";

interface StrikeWarningModalProps {
  isOpen: boolean;
  strikeCount: number;
  strikes: StrikeInfo[];
  onDismiss: () => void;
}

const REASON_LABELS: Record<string, string> = {
  "Strike issued for: Inappropriate Avatar": "Inappropriate Avatar",
  "Strike issued for: Offensive Message": "Offensive Message",
  "Strike issued for: Harassment": "Harassment",
  "Strike issued for: Spam": "Spam",
};

function formatReason(reason: string): string {
  return REASON_LABELS[reason] || reason;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function StrikeWarningModal({
  isOpen,
  strikeCount,
  strikes,
  onDismiss,
}: StrikeWarningModalProps) {
  const strikesRemaining = 3 - strikeCount;
  const isLastWarning = strikeCount === 2;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onDismiss}
      size="lg"
      classNames={{
        base: "bg-gray-800 text-white",
        header: "border-b border-gray-700",
        body: "py-6",
        footer: "border-t border-gray-700",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            <span
              className={`text-xl ${isLastWarning ? "text-red-400" : "text-yellow-400"}`}
            >
              Account Warning
            </span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* Strike Counter */}
            <div className="flex items-center justify-center gap-2">
              {[1, 2, 3].map((num) => (
                <div
                  key={num}
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                    num <= strikeCount
                      ? "bg-red-500 text-white"
                      : "bg-gray-700 text-gray-500"
                  }`}
                >
                  {num}
                </div>
              ))}
            </div>

            <p className="text-center text-gray-300">
              You have{" "}
              <span className="font-bold text-yellow-400">
                {strikeCount} of 3
              </span>{" "}
              strikes on your account.
            </p>

            {isLastWarning && (
              <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-center">
                <p className="text-red-400 font-semibold">
                  This is your final warning!
                </p>
                <p className="text-gray-300 text-sm mt-1">
                  One more violation will result in a permanent ban.
                </p>
              </div>
            )}

            {/* Strike Details */}
            <div className="space-y-2">
              <p className="text-sm text-gray-400">Strike history:</p>
              {strikes.map((strike, index) => (
                <div
                  key={index}
                  className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Chip color="danger" size="sm" variant="flat">
                      Strike {index + 1}
                    </Chip>
                    <span className="text-gray-300 text-sm">
                      {formatReason(strike.reason)}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {formatDate(strike.issuedAt)}
                  </span>
                </div>
              ))}
            </div>

            {strikesRemaining > 0 && (
              <p className="text-gray-400 text-sm text-center">
                {strikesRemaining === 1 ? (
                  <span className="text-red-400">
                    You have 1 strike remaining before your account is banned.
                  </span>
                ) : (
                  <>
                    You have {strikesRemaining} strikes remaining before your
                    account is banned.
                  </>
                )}
              </p>
            )}

            <p className="text-gray-500 text-xs text-center">
              Please follow our community guidelines to avoid further action.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onPress={onDismiss}>
            I Understand
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

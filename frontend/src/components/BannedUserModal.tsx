"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@nextui-org/react";
import { signOut } from "aws-amplify/auth";

interface BannedUserModalProps {
  isOpen: boolean;
  banReason: string | null;
}

export function BannedUserModal({ isOpen, banReason }: BannedUserModalProps) {
  const handleSignOut = async () => {
    try {
      await signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Error signing out:", error);
      window.location.href = "/";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      hideCloseButton
      isDismissable={false}
      isKeyboardDismissDisabled
      size="md"
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
            <span className="text-2xl">🚫</span>
            <span className="text-xl text-red-400">Account Suspended</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <p className="text-gray-300">
            Your account has been suspended from Quiz Night Live.
          </p>
          {banReason && (
            <div className="mt-4 bg-red-900/30 border border-red-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Reason:</p>
              <p className="text-white">{banReason}</p>
            </div>
          )}
          <p className="mt-4 text-gray-400 text-sm">
            If you believe this is a mistake, please contact support at{" "}
            <a
              href="mailto:support@quiznight.live"
              className="text-blue-400 hover:underline"
            >
              support@quiznight.live
            </a>
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="danger" variant="flat" onPress={handleSignOut}>
            Sign Out
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

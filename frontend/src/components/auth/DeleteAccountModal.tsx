"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@nextui-org/react";
import { useAuth } from "@/contexts/AuthContext";
import { deleteMyAccount } from "@/lib/api";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({
  isOpen,
  onClose,
}: DeleteAccountModalProps) {
  const { signOut } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const CONFIRM_PHRASE = "DELETE MY ACCOUNT";
  const isConfirmed = confirmText === CONFIRM_PHRASE;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError("");

    try {
      const result = await deleteMyAccount();

      if (result.success) {
        // Sign out and redirect
        await signOut();
        window.location.href = "/?deleted=true";
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error("Failed to delete account:", err);
      setError(
        "Failed to delete account. Please try again or contact support.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText("");
    setError("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
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
          <span className="text-red-500">Delete Account</span>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 font-semibold mb-2">
                This action cannot be undone!
              </p>
              <p className="text-gray-300 text-sm">
                Deleting your account will permanently remove:
              </p>
              <ul className="text-gray-400 text-sm list-disc pl-5 mt-2 space-y-1">
                <li>Your profile and display name</li>
                <li>All game statistics and scores</li>
                <li>Your leaderboard rankings</li>
                <li>All earned badges and achievements</li>
                <li>Your subscription (if any)</li>
              </ul>
            </div>

            <div>
              <p className="text-gray-300 text-sm mb-2">
                To confirm, type{" "}
                <span className="font-mono text-red-400">{CONFIRM_PHRASE}</span>{" "}
                below:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type here to confirm"
                variant="bordered"
                classNames={{
                  input: "text-white",
                  inputWrapper: "border-gray-600",
                }}
                isDisabled={isDeleting}
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={handleClose} isDisabled={isDeleting}>
            Cancel
          </Button>
          <Button
            color="danger"
            onPress={handleDelete}
            isDisabled={!isConfirmed || isDeleting}
            isLoading={isDeleting}
          >
            Permanently Delete Account
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

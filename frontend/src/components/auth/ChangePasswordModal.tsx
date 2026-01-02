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
import { EyeFilledIcon, EyeSlashFilledIcon } from "./EyeIcons";
import {
  PasswordStrengthIndicator,
  usePasswordValidation,
} from "./PasswordStrengthIndicator";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ChangePasswordModalProps) {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isCurrentVisible, setIsCurrentVisible] = useState(false);
  const [isNewVisible, setIsNewVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { isValid: isPasswordValid } = usePasswordValidation(newPassword);

  const resetState = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
    setSuccess(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (!isPasswordValid) {
      setError("New password does not meet requirements");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      onSuccess?.();
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Failed to change password",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleChangePassword();
    }
  };

  const isDisabled =
    !currentPassword ||
    !newPassword ||
    !confirmPassword ||
    !isPasswordValid ||
    newPassword !== confirmPassword;

  const renderForm = () => (
    <div className="space-y-4">
      <Input
        label="Current Password"
        type={isCurrentVisible ? "text" : "password"}
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={loading}
        variant="bordered"
        classNames={{
          input: "text-white",
          label: "text-gray-400",
        }}
        endContent={
          <button
            className="focus:outline-none"
            type="button"
            onClick={() => setIsCurrentVisible(!isCurrentVisible)}
          >
            {isCurrentVisible ? (
              <EyeFilledIcon className="text-xl text-gray-400" />
            ) : (
              <EyeSlashFilledIcon className="text-xl text-gray-400" />
            )}
          </button>
        }
      />
      <Input
        label="New Password"
        type={isNewVisible ? "text" : "password"}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={loading}
        variant="bordered"
        classNames={{
          input: "text-white",
          label: "text-gray-400",
        }}
        endContent={
          <button
            className="focus:outline-none"
            type="button"
            onClick={() => setIsNewVisible(!isNewVisible)}
          >
            {isNewVisible ? (
              <EyeFilledIcon className="text-xl text-gray-400" />
            ) : (
              <EyeSlashFilledIcon className="text-xl text-gray-400" />
            )}
          </button>
        }
      />
      <PasswordStrengthIndicator password={newPassword} />
      <Input
        label="Confirm New Password"
        type={isConfirmVisible ? "text" : "password"}
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={loading}
        variant="bordered"
        isInvalid={!!confirmPassword && newPassword !== confirmPassword}
        errorMessage={
          confirmPassword && newPassword !== confirmPassword
            ? "Passwords do not match"
            : undefined
        }
        classNames={{
          input: "text-white",
          label: "text-gray-400",
        }}
        endContent={
          <button
            className="focus:outline-none"
            type="button"
            onClick={() => setIsConfirmVisible(!isConfirmVisible)}
          >
            {isConfirmVisible ? (
              <EyeFilledIcon className="text-xl text-gray-400" />
            ) : (
              <EyeSlashFilledIcon className="text-xl text-gray-400" />
            )}
          </button>
        }
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );

  const renderSuccess = () => (
    <div className="space-y-4 text-center">
      <div className="flex justify-center">
        <svg
          className="w-16 h-16 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <p className="text-gray-300">
        Your password has been changed successfully!
      </p>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      classNames={{
        base: "bg-gray-900 border border-gray-700",
        header: "border-b border-gray-700",
        body: "py-6",
        footer: "border-t border-gray-700",
      }}
    >
      <ModalContent>
        {(closeModal) => (
          <>
            <ModalHeader className="flex flex-col items-center gap-1 text-white">
              <h2 className="text-xl font-bold">
                {success ? "Password Changed" : "Change Password"}
              </h2>
            </ModalHeader>
            <ModalBody>{success ? renderSuccess() : renderForm()}</ModalBody>
            <ModalFooter className="flex flex-col gap-2">
              {success ? (
                <Button
                  color="primary"
                  onPress={handleClose}
                  className="w-full"
                >
                  Done
                </Button>
              ) : (
                <>
                  <Button
                    color="primary"
                    onPress={handleChangePassword}
                    isDisabled={isDisabled}
                    isLoading={loading}
                    className="w-full"
                  >
                    Change Password
                  </Button>
                  <Button
                    color="default"
                    variant="bordered"
                    onPress={closeModal}
                    isDisabled={loading}
                    className="w-full text-gray-300 border-gray-600 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

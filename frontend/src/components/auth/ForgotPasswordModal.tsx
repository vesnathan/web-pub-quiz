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

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type ForgotPasswordStep = "enter-email" | "enter-code" | "success";

export function ForgotPasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: ForgotPasswordModalProps) {
  const { forgotPassword, confirmForgotPassword } = useAuth();

  const [step, setStep] = useState<ForgotPasswordStep>("enter-email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { isValid: isPasswordValid } = usePasswordValidation(newPassword);

  const resetState = () => {
    setStep("enter-email");
    setEmail("");
    setCode("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSendCode = async () => {
    if (!email) return;

    setError("");
    setLoading(true);

    try {
      await forgotPassword(email);
      setStep("enter-code");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Failed to send reset code",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!code || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid) {
      setError("Password does not meet requirements");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await confirmForgotPassword(email, code, newPassword);
      setStep("success");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Failed to reset password",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  const renderEmailStep = () => (
    <div className="space-y-4">
      <p className="text-gray-400 text-center text-sm">
        Enter your email address and we&apos;ll send you a code to reset your
        password.
      </p>
      <Input
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, handleSendCode)}
        isDisabled={loading}
        variant="bordered"
        classNames={{
          input: "text-white",
          label: "text-gray-400",
        }}
      />
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );

  const renderCodeStep = () => (
    <div className="space-y-4">
      <p className="text-gray-400 text-center text-sm">
        We sent a code to <strong className="text-white">{email}</strong>
      </p>
      <Input
        label="Reset Code"
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, handleResetPassword)}
        isDisabled={loading}
        variant="bordered"
        classNames={{
          input: "text-white",
          label: "text-gray-400",
        }}
      />
      <Input
        label="New Password"
        type={isPasswordVisible ? "text" : "password"}
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, handleResetPassword)}
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
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            {isPasswordVisible ? (
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
        onKeyDown={(e) => handleKeyDown(e, handleResetPassword)}
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

  const renderSuccessStep = () => (
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
        Your password has been reset successfully!
      </p>
      <p className="text-gray-400 text-sm">
        You can now log in with your new password.
      </p>
    </div>
  );

  const getTitle = () => {
    switch (step) {
      case "enter-email":
        return "Forgot Password";
      case "enter-code":
        return "Reset Password";
      case "success":
        return "Password Reset";
      default:
        return "Forgot Password";
    }
  };

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
              <h2 className="text-xl font-bold">{getTitle()}</h2>
            </ModalHeader>
            <ModalBody>
              {step === "enter-email" && renderEmailStep()}
              {step === "enter-code" && renderCodeStep()}
              {step === "success" && renderSuccessStep()}
            </ModalBody>
            <ModalFooter className="flex flex-col gap-2">
              {step === "enter-email" && (
                <>
                  <Button
                    color="primary"
                    onPress={handleSendCode}
                    isDisabled={!email}
                    isLoading={loading}
                    className="w-full"
                  >
                    Send Reset Code
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
              {step === "enter-code" && (
                <>
                  <Button
                    color="primary"
                    onPress={handleResetPassword}
                    isDisabled={
                      !code ||
                      !newPassword ||
                      !confirmPassword ||
                      !isPasswordValid ||
                      newPassword !== confirmPassword
                    }
                    isLoading={loading}
                    className="w-full"
                  >
                    Reset Password
                  </Button>
                  <Button
                    color="default"
                    variant="bordered"
                    onPress={() => setStep("enter-email")}
                    isDisabled={loading}
                    className="w-full text-gray-300 border-gray-600 hover:bg-gray-800"
                  >
                    Back
                  </Button>
                </>
              )}
              {step === "success" && (
                <Button
                  color="primary"
                  onPress={() => {
                    handleClose();
                    onSuccess();
                  }}
                  className="w-full"
                >
                  Done
                </Button>
              )}
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

"use client";

import { useState, useCallback } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Tabs,
  Tab,
} from "@nextui-org/react";
import { LoginForm } from "./LoginForm";
import { RegistrationForm } from "./RegistrationForm";
import { ConfirmationForm } from "./ConfirmationForm";
import { ForgotPasswordModal } from "./ForgotPasswordModal";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
  onAuthSuccess?: () => void;
  nativeAccountExistsMessage?: boolean;
}

type AuthStep = "login" | "register" | "confirm";

interface ConfirmationState {
  email: string;
  password: string;
}

export function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  onAuthSuccess,
  nativeAccountExistsMessage = false,
}: AuthModalProps) {
  const [selectedTab, setSelectedTab] = useState<string>(initialMode);
  const [authStep, setAuthStep] = useState<AuthStep>(initialMode);
  const [confirmationState, setConfirmationState] = useState<ConfirmationState>(
    { email: "", password: "" },
  );
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const resetState = useCallback(() => {
    setSelectedTab(initialMode);
    setAuthStep(initialMode);
    setConfirmationState({ email: "", password: "" });
  }, [initialMode]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleSuccess = useCallback(() => {
    handleClose();
    onAuthSuccess?.();
  }, [handleClose, onAuthSuccess]);

  const handleConfirmRequired = useCallback(
    (email: string, password: string = "") => {
      setConfirmationState({ email, password });
      setAuthStep("confirm");
      setSelectedTab("register");
    },
    [],
  );

  const handleTabChange = useCallback((key: React.Key) => {
    const tab = key as string;
    setSelectedTab(tab);
    setAuthStep(tab as AuthStep);
  }, []);

  const renderContent = () => {
    if (authStep === "confirm") {
      return (
        <ConfirmationForm
          email={confirmationState.email}
          password={confirmationState.password}
          onSuccess={handleSuccess}
        />
      );
    }

    if (selectedTab === "login") {
      return (
        <>
          {nativeAccountExistsMessage && (
            <div className="mb-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <p className="text-white mb-1 font-medium">
                This email is already registered.
              </p>
              <p className="text-gray-400 text-sm">
                Please sign in with your email and password.
              </p>
            </div>
          )}
          <LoginForm
            onSuccess={handleSuccess}
            onForgotPassword={() => setShowForgotPassword(true)}
            onConfirmRequired={(email) => handleConfirmRequired(email)}
          />
        </>
      );
    }

    return (
      <RegistrationForm
        onSuccess={handleSuccess}
        onConfirmRequired={handleConfirmRequired}
      />
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        isDismissable={false}
        scrollBehavior="inside"
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
              <ModalHeader className="flex flex-col items-center gap-4 text-white pt-6">
                <h2 className="text-2xl font-bold">Quiz Night Live</h2>
                {authStep !== "confirm" && (
                  <Tabs
                    selectedKey={selectedTab}
                    onSelectionChange={handleTabChange}
                    classNames={{
                      tabList: "bg-gray-800 p-1",
                      tab: "text-white",
                      cursor: "bg-primary",
                    }}
                  >
                    <Tab key="login" title="Login" />
                    <Tab key="register" title="Register" />
                  </Tabs>
                )}
              </ModalHeader>
              <ModalBody>{renderContent()}</ModalBody>
              <ModalFooter className="flex flex-col gap-2">
                <Button
                  color="default"
                  variant="bordered"
                  onPress={closeModal}
                  className="w-full text-gray-300 border-gray-600 hover:bg-gray-800"
                >
                  Cancel
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onSuccess={() => setShowForgotPassword(false)}
      />
    </>
  );
}

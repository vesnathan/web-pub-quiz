"use client";

import { useState } from "react";
import { Input, Button } from "@nextui-org/react";
import { useAuth } from "@/contexts/AuthContext";

interface ConfirmationFormProps {
  email: string;
  password: string;
  onSuccess: () => void;
}

export function ConfirmationForm({
  email,
  password,
  onSuccess,
}: ConfirmationFormProps) {
  const { confirmSignUp, signIn } = useAuth();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (!code) return;

    setError("");
    setIsLoading(true);

    try {
      await confirmSignUp(email, code);
      // Auto sign in after confirmation if password is available
      if (password) {
        await signIn(email, password);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-gray-400 text-center text-sm">
        We sent a confirmation code to
        <br />
        <strong className="text-white">{email}</strong>
      </p>

      <Input
        label="Confirmation Code"
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={isLoading}
        variant="bordered"
        classNames={{
          input: "text-white",
          label: "text-gray-400",
        }}
      />

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <Button
        color="primary"
        onPress={handleConfirm}
        isDisabled={!code}
        isLoading={isLoading}
        className="w-full"
      >
        Confirm
      </Button>
    </div>
  );
}

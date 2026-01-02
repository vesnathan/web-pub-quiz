"use client";

import { useState } from "react";
import { Input, Button } from "@nextui-org/react";
import { useAuth } from "@/contexts/AuthContext";
import { EyeFilledIcon, EyeSlashFilledIcon } from "./EyeIcons";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { checkEmailHasGoogleAccount } from "@/lib/api";

interface LoginFormProps {
  onSuccess: () => void;
  onForgotPassword: () => void;
  onConfirmRequired: (email: string) => void;
}

export function LoginForm({
  onSuccess,
  onForgotPassword,
  onConfirmRequired,
}: LoginFormProps) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [hasGoogleAccount, setHasGoogleAccount] = useState<boolean | null>(
    null,
  );

  const handleLogin = async () => {
    if (!email || !password) return;

    setError("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      onSuccess();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message === "CONFIRM_SIGN_UP_REQUIRED") {
        onConfirmRequired(email);
      } else if (
        message.includes("User does not exist") ||
        message.includes("UserNotFoundException")
      ) {
        // Check if a Google account exists with this email
        try {
          const hasGoogle = await checkEmailHasGoogleAccount(email);
          setHasGoogleAccount(hasGoogle);
          setError("");
        } catch (checkErr) {
          // If the check fails, show generic message
          console.error("checkEmailHasGoogleAccount error:", checkErr);
          setHasGoogleAccount(null);
          setError("No account found with this email.");
        }
      } else {
        setError(message);
        setHasGoogleAccount(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  const isDisabled = !email || !password;

  return (
    <div className="space-y-4">
      <GoogleSignInButton isDisabled={isLoading} onError={setError} />

      <Input
        label="Email address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={isLoading}
        variant="bordered"
        classNames={{
          input: "text-white",
          label: "text-gray-400",
        }}
      />

      <Input
        label="Password"
        type={isPasswordVisible ? "text" : "password"}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKeyDown}
        isDisabled={isLoading}
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

      {hasGoogleAccount === true && (
        <div className="p-4 bg-blue-900/30 border border-blue-700 rounded-lg space-y-3">
          <div>
            <p className="text-white mb-1 font-medium">
              This email is registered with Google.
            </p>
            <p className="text-gray-400 text-sm">
              Please sign in with Google to continue.
            </p>
          </div>
          <GoogleSignInButton onError={setError} showDivider={false} />
        </div>
      )}

      {hasGoogleAccount === false && (
        <div className="p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
          <p className="text-white mb-1 font-medium">
            No account found with this email.
          </p>
          <p className="text-gray-400 text-sm">
            Please check your email or create a new account using the Register
            tab.
          </p>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="button"
        onClick={onForgotPassword}
        className="text-sm text-primary hover:text-primary-400 hover:underline"
        disabled={isLoading}
      >
        Forgot password?
      </button>

      <Button
        color="primary"
        onPress={handleLogin}
        isDisabled={isDisabled}
        isLoading={isLoading}
        className="w-full"
      >
        Log In
      </Button>
    </div>
  );
}

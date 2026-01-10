"use client";

import { useState } from "react";
import { Button } from "@nextui-org/react";
import { signInWithRedirect } from "aws-amplify/auth";
import { FACEBOOK_OAUTH_ENABLED } from "@/lib/amplify";

interface FacebookSignInButtonProps {
  isDisabled?: boolean;
  onError?: (message: string) => void;
  showDivider?: boolean;
}

export function FacebookSignInButton({
  isDisabled,
  onError,
  showDivider = false,
}: FacebookSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!FACEBOOK_OAUTH_ENABLED) {
    return null;
  }

  const handleFacebookSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithRedirect({ provider: "Facebook" });
    } catch (error: unknown) {
      setIsLoading(false);
      const err = error as { name?: string };
      if (err?.name === "UserAlreadyAuthenticatedException") {
        onError?.("You are already signed in. Please refresh the page.");
      } else {
        onError?.("Facebook sign-in failed. Please try again.");
      }
    }
  };

  return (
    <>
      <Button
        variant="bordered"
        onPress={handleFacebookSignIn}
        isDisabled={isDisabled || isLoading}
        isLoading={isLoading}
        className="w-full text-white border-gray-600 hover:bg-gray-800"
        startContent={!isLoading ? <FacebookIcon /> : undefined}
      >
        {isLoading ? "Redirecting to Facebook..." : "Continue with Facebook"}
      </Button>
      {showDivider && (
        <div className="relative w-full my-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-900 text-gray-400">or</span>
          </div>
        </div>
      )}
    </>
  );
}

function FacebookIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

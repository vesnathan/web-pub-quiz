"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  signIn,
  signUp,
  signOut,
  confirmSignUp,
  getCurrentUser,
  fetchAuthSession,
  fetchUserAttributes,
  resendSignUpCode,
  resetPassword,
  confirmResetPassword,
  updatePassword,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { configureAmplify } from "@/lib/amplify";
import { getMyProfile } from "@/lib/api";
import type { Badge, UserSubscription } from "@quiz/shared";

// Ensure Amplify is configured before any auth operations
if (typeof window !== "undefined") {
  configureAmplify();
}

export interface AuthUser {
  userId: string;
  username: string;
  email: string;
  name?: string;
  picture?: string;
  badges?: Badge[];
  totalSkillPoints?: number;
  subscription?: UserSubscription;
  tipUnlockedUntil?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  oauthError: string | null;
  clearOAuthError: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    screenName?: string,
  ) => Promise<{ isSignUpComplete: boolean; userId?: string }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  confirmForgotPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [oauthError, setOAuthError] = useState<string | null>(null);

  const clearOAuthError = useCallback(() => {
    setOAuthError(null);
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      const attributes = await fetchUserAttributes();

      // Get profile using API layer
      const profile = await getMyProfile();

      setUser({
        userId: currentUser.userId,
        username: currentUser.username,
        email: attributes.email || "",
        name:
          profile?.displayName || attributes.email?.split("@")[0] || "Player",
        picture: attributes.picture || undefined,
        badges: profile?.badges || [],
        totalSkillPoints: profile?.totalSkillPoints || 0,
        subscription: profile?.subscription ?? undefined,
        tipUnlockedUntil: profile?.tipUnlockedUntil ?? undefined,
      });
    } catch {
      // User not logged in
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Listen for OAuth sign-in events (e.g., after Google redirect)
    const hubListener = Hub.listen("auth", async ({ payload }) => {
      if (payload.event === "signInWithRedirect") {
        await loadUser();
      } else if (payload.event === "signInWithRedirect_failure") {
        setUser(null);
        setIsLoading(false);
        // Check for specific errors from Cognito PreSignUp trigger
        const errorMessage = String(payload.data?.error || "");
        if (errorMessage.includes("NATIVE_ACCOUNT_EXISTS")) {
          setOAuthError("NATIVE_ACCOUNT_EXISTS");
        } else if (errorMessage.includes("PreSignUp")) {
          // Generic PreSignUp error - likely account conflict
          setOAuthError("NATIVE_ACCOUNT_EXISTS");
        }
      } else if (payload.event === "signedIn") {
        await loadUser();
      } else if (payload.event === "signedOut") {
        setUser(null);
      }
    });

    // Initial load - this also handles OAuth redirect completion
    loadUser();

    return () => hubListener();
  }, [loadUser]);

  const handleSignIn = async (email: string, password: string) => {
    const result = await signIn({ username: email, password });

    if (result.isSignedIn) {
      await loadUser();
    } else if (result.nextStep.signInStep === "CONFIRM_SIGN_UP") {
      throw new Error("CONFIRM_SIGN_UP_REQUIRED");
    }
  };

  const handleSignUp = async (
    email: string,
    password: string,
    screenName?: string,
  ) => {
    const result = await signUp({
      username: email,
      password,
      options: {
        userAttributes: {
          email,
          ...(screenName && { preferred_username: screenName }),
        },
      },
    });

    return {
      isSignUpComplete: result.isSignUpComplete,
      userId: result.userId,
    };
  };

  const handleConfirmSignUp = async (email: string, code: string) => {
    await confirmSignUp({ username: email, confirmationCode: code });
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
  };

  const handleResendConfirmationCode = async (email: string) => {
    await resendSignUpCode({ username: email });
  };

  const handleForgotPassword = async (email: string) => {
    await resetPassword({ username: email });
  };

  const handleConfirmForgotPassword = async (
    email: string,
    code: string,
    newPassword: string,
  ) => {
    await confirmResetPassword({
      username: email,
      confirmationCode: code,
      newPassword,
    });
  };

  const handleChangePassword = async (
    oldPassword: string,
    newPassword: string,
  ) => {
    await updatePassword({ oldPassword, newPassword });
  };

  const getIdToken = async (): Promise<string | null> => {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch {
      return null;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    oauthError,
    clearOAuthError,
    signIn: handleSignIn,
    signUp: handleSignUp,
    confirmSignUp: handleConfirmSignUp,
    signOut: handleSignOut,
    resendConfirmationCode: handleResendConfirmationCode,
    forgotPassword: handleForgotPassword,
    confirmForgotPassword: handleConfirmForgotPassword,
    changePassword: handleChangePassword,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

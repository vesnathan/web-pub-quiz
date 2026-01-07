"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button, Card, CardBody, Input } from "@nextui-org/react";
import { signInWithRedirect } from "aws-amplify/auth";
import { useAuth } from "@/contexts/AuthContext";
import { Leaderboards } from "@/components/Leaderboards";
import { RoomList } from "@/components/RoomList";
import { AppFooter } from "@/components/AppFooter";
import { SplashScreen } from "@/components/SplashScreen";
import { GameBackground } from "@/components/GameBackground";
import { LoadingScreen, LoadingDots } from "@/components/LoadingScreen";
import { MaintenanceScreen } from "@/components/MaintenanceScreen";
import { useLobbyPresence } from "@/hooks/useLobbyPresence";
import { useLobbyChannel } from "@/hooks/useLobbyChannel";
import { useSubscription } from "@/hooks/useSubscription";
import { useScreenNameCheck } from "@/hooks/useScreenNameCheck";
import { AuthModal } from "@/components/auth/AuthModal";
import { GiftSubscriptionModal } from "@/components/GiftSubscriptionModal";
import { TipSupporterCards, OnlineChip, AdBanner } from "@/components/home";
import { InviteFriend } from "@/components/InviteFriend";
import { useReferral } from "@/hooks/useReferral";
import { GOOGLE_OAUTH_ENABLED } from "@/lib/amplify";

const ADMIN_EMAIL = "vesnathan+qnl-admin@gmail.com";

// Check splash state synchronously before component renders
function getSplashState(): boolean | null {
  if (typeof window === "undefined") return null;
  const isOAuthCallback =
    window.location.search.includes("code=") ||
    window.location.hash.includes("access_token") ||
    window.location.search.includes("error_description=");
  const hasSeenSplash = sessionStorage.getItem("splash-seen") === "true";
  return !isOAuthCallback && !hasSeenSplash;
}

export default function Home() {
  const { user, isAuthenticated, isLoading, oauthError, clearOAuthError } =
    useAuth();

  const { activeUserCount, isConnected } = useLobbyPresence({
    enabled: true,
    userId: user?.userId,
    displayName: user?.name || user?.email?.split("@")[0],
  });

  const { maintenanceMode, maintenanceMessage } = useLobbyChannel();

  // Check if user is admin (admins can bypass maintenance mode)
  const isAdmin = user?.email === ADMIN_EMAIL;

  const {
    isAdFree,
    hasUnseenGift,
    giftInfo,
    tier,
    refreshSubscription,
    isLoading: subscriptionLoading,
    questionsRemainingToday,
    hasUnlimitedQuestions,
  } = useSubscription();

  const [showGiftModal, setShowGiftModal] = useState(false);
  const giftModalDismissedRef = useRef(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [accountLinkedMessage, setAccountLinkedMessage] = useState<
    string | null
  >(null);
  const [nativeAccountMessage, setNativeAccountMessage] = useState(false);
  const [showSplash, setShowSplash] = useState<boolean | null>(() =>
    getSplashState(),
  );
  const [guestName, setGuestName] = useState("");

  // Screen name validation for guest users
  const {
    status: screenNameStatus,
    checkName,
    reset: resetScreenNameCheck,
  } = useScreenNameCheck();

  // Referral tracking - captures ?ref= parameter and records referral on auth
  const { recordReferral, getReferrerId } = useReferral();

  // Record referral when user first authenticates (if they came from a referral link)
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const referrerId = getReferrerId();
      if (referrerId) {
        recordReferral();
      }
    }
  }, [isAuthenticated, isLoading, getReferrerId, recordReferral]);

  // Check guest name availability when it changes
  const handleGuestNameChange = useCallback(
    (name: string) => {
      setGuestName(name);
      if (name.trim().length >= 3) {
        checkName(name.trim());
      } else {
        resetScreenNameCheck();
      }
    },
    [checkName, resetScreenNameCheck],
  );

  // Check immediately on blur
  const handleGuestNameBlur = useCallback(() => {
    if (guestName.trim().length >= 3) {
      checkName(guestName.trim(), true);
    }
  }, [guestName, checkName]);

  // Whether the guest name is valid for joining
  const isGuestNameValid =
    guestName.trim().length >= 3 && screenNameStatus === "available";

  // Show gift modal when user has unseen gift
  useEffect(() => {
    if (
      isAuthenticated &&
      hasUnseenGift &&
      !showGiftModal &&
      !giftModalDismissedRef.current
    ) {
      setShowGiftModal(true);
    }
  }, [isAuthenticated, hasUnseenGift, showGiftModal]);

  const handleGiftModalClose = useCallback(async () => {
    giftModalDismissedRef.current = true;
    setShowGiftModal(false);
    await refreshSubscription();
  }, [refreshSubscription]);

  // Handle NATIVE_ACCOUNT_EXISTS error from OAuth
  useEffect(() => {
    if (oauthError === "NATIVE_ACCOUNT_EXISTS") {
      setNativeAccountMessage(true);
      setAuthMode("login");
      setShowAuthModal(true);
      clearOAuthError();
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", window.location.pathname);
      }
    }
  }, [oauthError, clearOAuthError]);

  // Handle OAuth error callback - detect when accounts were linked
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const errorDescription = urlParams.get("error_description");

    if (errorDescription?.includes("LINKED_TO_EXISTING_USER")) {
      window.history.replaceState({}, "", window.location.pathname);
      setAccountLinkedMessage(
        "Your Google account has been linked to your existing account. Signing you in...",
      );

      const timer = setTimeout(async () => {
        try {
          await signInWithRedirect({ provider: "Google" });
        } catch (error) {
          console.error("Auto sign-in failed:", error);
          setAccountLinkedMessage(
            "Your accounts are linked! Please click 'Continue with Google' to sign in.",
          );
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, []);

  // On mount, determine splash state
  useEffect(() => {
    if (showSplash === null) {
      setShowSplash(getSplashState() ?? false);
    }
  }, [showSplash]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("splash-seen", "true");
    }
  }, []);

  const handleAuthRequired = useCallback(
    (mode: "login" | "register" = "login") => {
      setAuthMode(mode);
      setShowAuthModal(true);
    },
    [],
  );

  const handleGoogleSignIn = async () => {
    try {
      await signInWithRedirect({ provider: "Google" });
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  // SSR hydration - render nothing until we know splash state
  if (showSplash === null) {
    return null;
  }

  // Splash screen
  if (showSplash) {
    return (
      <SplashScreen
        onComplete={handleSplashComplete}
        minDuration={3000}
        isConnected={!isLoading && isConnected}
        connectionTimeout={15000}
      />
    );
  }

  // Loading state
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Maintenance mode - show maintenance screen for non-admin users
  if (maintenanceMode && !isAdmin) {
    return <MaintenanceScreen message={maintenanceMessage || undefined} />;
  }

  return (
    <GameBackground>
      {/* Beta Tag */}
      <div className="fixed top-2 right-2 z-50">
        <div className="bg-yellow-500/90 text-black text-xs font-bold px-2 py-1 rounded-full shadow-lg">
          BETA
        </div>
      </div>

      <main className="p-8 pb-20 flex-grow">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Main Card - Auth or Welcome */}
              <Card className="bg-gray-900/70 backdrop-blur-sm">
                <CardBody className={isAuthenticated ? "p-6" : "p-8"}>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-bold">
                        {isAuthenticated
                          ? `Welcome, ${user?.name || user?.email?.split("@")[0]}!`
                          : "Join the Quiz"}
                      </h2>
                      {!isAuthenticated && (
                        <OnlineChip
                          isConnected={isConnected}
                          activeUserCount={activeUserCount}
                        />
                      )}
                    </div>
                    {isAuthenticated && <InviteFriend />}
                  </div>

                  {isAuthenticated ? (
                    // Authenticated: Show badges
                    <div className="p-4 bg-default-100 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">Your Badges</h3>
                        {user?.totalSkillPoints ? (
                          <span className="text-sm text-purple-400 font-semibold">
                            {user.totalSkillPoints} SP
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {user?.badges && user.badges.length > 0 ? (
                          user.badges.slice(0, 8).map((badge) => (
                            <div
                              key={badge.id + badge.earnedAt}
                              className="w-12 h-12 rounded-full bg-gray-700/80 flex items-center justify-center text-2xl"
                              title={`${badge.name} - ${badge.description}`}
                            >
                              {badge.icon}
                            </div>
                          ))
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center text-2xl opacity-30">
                              🏆
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center text-2xl opacity-30">
                              🔥
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center text-2xl opacity-30">
                              ⭐
                            </div>
                            <div className="w-12 h-12 rounded-full bg-gray-700/50 flex items-center justify-center text-2xl opacity-30">
                              🎯
                            </div>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {user?.badges && user.badges.length > 0
                          ? `${user.badges.length} badge${user.badges.length !== 1 ? "s" : ""} earned`
                          : "Play quiz sets to earn badges!"}
                      </p>
                    </div>
                  ) : (
                    // Unauthenticated: Show guest play option and sign in
                    <>
                      {accountLinkedMessage && (
                        <div className="mb-4 p-4 bg-success-100 border border-success-300 rounded-lg">
                          <p className="text-success-700 text-sm font-medium">
                            {accountLinkedMessage}
                          </p>
                        </div>
                      )}

                      {/* Guest Play Section */}
                      <div className="p-4 bg-gray-800/50 rounded-lg mb-4">
                        <Input
                          label="Your display name"
                          placeholder="Enter a name to play as guest"
                          value={guestName}
                          onValueChange={handleGuestNameChange}
                          onBlur={handleGuestNameBlur}
                          variant="bordered"
                          size="sm"
                          isInvalid={screenNameStatus === "taken"}
                          errorMessage={
                            screenNameStatus === "taken"
                              ? "This name is already taken"
                              : undefined
                          }
                          description={
                            guestName.trim().length > 0 &&
                            guestName.trim().length < 3
                              ? "Name must be at least 3 characters"
                              : undefined
                          }
                          endContent={
                            screenNameStatus === "checking" ? (
                              <LoadingDots className="scale-75" />
                            ) : screenNameStatus === "available" ? (
                              <span className="text-green-400 text-lg font-bold">
                                ✓
                              </span>
                            ) : screenNameStatus === "taken" ? (
                              <span className="text-red-400 text-lg font-bold">
                                ✗
                              </span>
                            ) : null
                          }
                          classNames={{
                            input: "text-white",
                            label: "text-gray-400",
                          }}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Playing as guest - progress won&apos;t be saved.
                        </p>
                      </div>

                      {/* Why Create Account */}
                      <div className="p-4 bg-primary-900/20 border border-primary-500/30 rounded-lg mb-4">
                        <h4 className="text-sm font-semibold text-primary-300 mb-2">
                          Why create an account?
                        </h4>
                        <ul className="text-xs text-gray-400 space-y-1">
                          <li className="flex items-center gap-2">
                            <span className="text-green-400">✓</span>
                            Track your scores and climb the leaderboard
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-400">✓</span>
                            Earn badges and skill points
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-green-400">✓</span>
                            Answer unlimited questions per day
                          </li>
                        </ul>
                      </div>

                      <div className="space-y-3">
                        {GOOGLE_OAUTH_ENABLED && (
                          <>
                            <Button
                              variant="bordered"
                              size="lg"
                              className="w-full font-semibold border-gray-600 hover:bg-gray-800"
                              onPress={handleGoogleSignIn}
                              isLoading={accountLinkedMessage?.includes(
                                "Signing you in",
                              )}
                              startContent={
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                  <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  />
                                  <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  />
                                  <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                  />
                                  <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                  />
                                </svg>
                              }
                            >
                              Continue with Google
                            </Button>
                            <div className="relative w-full">
                              <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-700" />
                              </div>
                              <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-content1 text-gray-400">
                                  or
                                </span>
                              </div>
                            </div>
                          </>
                        )}
                        <Button
                          color="primary"
                          variant="solid"
                          size="lg"
                          className="w-full font-semibold"
                          onPress={() => handleAuthRequired("login")}
                        >
                          Sign In
                        </Button>
                        <Button
                          color="default"
                          variant="bordered"
                          size="lg"
                          className="w-full font-semibold"
                          onPress={() => handleAuthRequired("register")}
                        >
                          Create Account
                        </Button>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>

              {/* Tip & Supporter Cards - shared component */}
              <TipSupporterCards
                isAuthenticated={isAuthenticated}
                onAuthRequired={() => handleAuthRequired("login")}
                tipUnlockedUntil={user?.tipUnlockedUntil}
              />

              {/* Leaderboards - only for authenticated */}
              {isAuthenticated && <Leaderboards />}
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <AdBanner isAdFree={isAdFree} isLoading={subscriptionLoading} />
              <RoomList
                guestName={!isAuthenticated ? guestName : undefined}
                isGuestNameValid={!isAuthenticated ? isGuestNameValid : true}
              />
            </div>
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setNativeAccountMessage(false);
          }}
          initialMode={authMode}
          nativeAccountExistsMessage={nativeAccountMessage}
        />
      </main>

      <AppFooter
        isConnected={isConnected}
        activeUserCount={activeUserCount}
        questionsRemaining={questionsRemainingToday}
        hasUnlimitedQuestions={hasUnlimitedQuestions}
      />

      {/* Gift Subscription Modal - only for authenticated */}
      {isAuthenticated && (
        <GiftSubscriptionModal
          isOpen={showGiftModal}
          onClose={handleGiftModalClose}
          giftedByName={giftInfo.giftedByName}
          giftTier={tier}
          giftExpiresAt={giftInfo.giftExpiresAt}
          isWelcomeGift={giftInfo.giftedBy === "system"}
        />
      )}
    </GameBackground>
  );
}

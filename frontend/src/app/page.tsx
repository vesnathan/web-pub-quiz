'use client';

import { useState, useCallback } from 'react';
import { Button, Card, CardBody, Chip } from '@nextui-org/react';
import { signInWithRedirect } from 'aws-amplify/auth';
import { useAuth } from '@/contexts/AuthContext';
import { Leaderboards } from '@/components/Leaderboards';
import { RoomList } from '@/components/RoomList';
import { LobbyBottomBar } from '@/components/LobbyBottomBar';
import { SplashScreen } from '@/components/SplashScreen';
import { GameBackground } from '@/components/GameBackground';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useLobbyPresence } from '@/hooks/useLobbyPresence';
import { AuthModal } from '@/components/auth/AuthModal';
import { GOOGLE_OAUTH_ENABLED } from '@/lib/amplify';

export default function Home() {
  const { user, isAuthenticated, isLoading } = useAuth();
  // Connect to Ably for all users (to receive game status updates)
  // Only authenticated users will enter presence
  const { activeUserCount, isConnected } = useLobbyPresence({
    enabled: true, // Always connect to receive game status
    userId: user?.userId,
    displayName: user?.name || user?.email?.split('@')[0],
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Check if returning from OAuth redirect or returning from game - skip splash if so
  const isOAuthCallback = typeof window !== 'undefined' &&
    (window.location.search.includes('code=') || window.location.hash.includes('access_token'));
  // Skip splash if coming from OAuth or if user has already seen it this session
  const hasSeenSplash = typeof window !== 'undefined' && sessionStorage.getItem('splash-seen') === 'true';
  const [showSplash, setShowSplash] = useState(!isOAuthCallback && !hasSeenSplash);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    // Remember that splash has been seen this session
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('splash-seen', 'true');
    }
  }, []);

  const handleLogin = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  const handleRegister = () => {
    setAuthMode('register');
    setShowAuthModal(true);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Error signing in with Google:', error);
    }
  };

  // Show splash screen for minimum 3 seconds AND until auth check AND Ably connection complete
  // Shows error after 15 seconds if connection fails
  if (showSplash) {
    const splashReady = !isLoading && isConnected;
    return <SplashScreen onComplete={handleSplashComplete} minDuration={3000} isConnected={splashReady} connectionTimeout={15000} />;
  }

  // Show loading state after splash
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Handler for unauthenticated users trying to join a room
  const handleUnauthenticatedJoinRoom = () => {
    setAuthMode('login');
    setShowAuthModal(true);
  };

  // Not authenticated view - show rooms but require login to join
  if (!isAuthenticated) {
    return (
      <GameBackground>
        <main className="p-8 pb-20 flex-grow">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Sign In Section */}
              <Card className="bg-gray-900/70 backdrop-blur-sm">
                <CardBody className="p-8">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                    <h2 className="text-2xl font-bold">
                      Join the Quiz
                    </h2>
                    <Chip
                      color={isConnected && activeUserCount > 0 ? 'success' : 'default'}
                      variant="flat"
                      size="sm"
                    >
                      {isConnected
                        ? `${activeUserCount} ${activeUserCount === 1 ? 'player' : 'players'} online`
                        : 'Connecting...'}
                    </Chip>
                  </div>

                  {/* Auth Buttons */}
                  <div className="space-y-4">
                    {GOOGLE_OAUTH_ENABLED && (
                      <>
                        <Button
                          variant="bordered"
                          size="lg"
                          className="w-full font-semibold border-gray-600 hover:bg-gray-800"
                          onPress={handleGoogleSignIn}
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
                            <span className="px-2 bg-content1 text-gray-400">or</span>
                          </div>
                        </div>
                      </>
                    )}
                    <Button
                      color="primary"
                      variant="solid"
                      size="lg"
                      className="w-full font-semibold"
                      onPress={handleLogin}
                    >
                      Sign In to Play
                    </Button>
                    <Button
                      color="default"
                      variant="bordered"
                      size="lg"
                      className="w-full font-semibold"
                      onPress={handleRegister}
                    >
                      Create Account
                    </Button>
                  </div>

                  {/* Game Rules */}
                  <div className="mt-6 p-4 bg-default-100 rounded-lg">
                    <h3 className="font-semibold mb-2">How to Play</h3>
                    <ul className="text-sm text-default-500 space-y-1">
                      <li>- Sets run every 30 minutes</li>
                      <li>- 20 questions per set</li>
                      <li>- Hit the buzzer when you know the answer</li>
                      <li>- +50 points for correct, -200 for wrong</li>
                      <li>- First to buzz gets 5 seconds to answer</li>
                    </ul>
                  </div>
                </CardBody>
              </Card>

              {/* Room List - clicking opens login modal */}
              <div>
                <RoomList onJoinRoom={handleUnauthenticatedJoinRoom} />
              </div>
            </div>
          </div>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            initialMode={authMode}
          />
        </main>
        <LobbyBottomBar isConnected={isConnected} activeUserCount={activeUserCount} />
      </GameBackground>
    );
  }

  // Authenticated view
  return (
    <GameBackground>
      <main className="p-8 pb-20 flex-grow">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left side: Welcome + Leaderboards */}
            <div className="space-y-6">
              {/* Welcome Card */}
              <Card className="bg-gray-900/70 backdrop-blur-sm">
                <CardBody className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                    <h2 className="text-2xl font-bold">
                      Welcome, {user?.name || user?.email.split('@')[0]}!
                    </h2>
                    <Chip
                      color={isConnected && activeUserCount > 0 ? 'success' : 'default'}
                      variant="flat"
                      size="sm"
                    >
                      {isConnected
                        ? `${activeUserCount} ${activeUserCount === 1 ? 'player' : 'players'} online`
                        : 'Connecting...'}
                    </Chip>
                  </div>

                  {/* Game Rules */}
                  <div className="p-4 bg-default-100 rounded-lg">
                    <h3 className="font-semibold mb-2">How to Play</h3>
                    <ul className="text-sm text-default-500 space-y-1">
                      <li>- Sets run every 30 minutes</li>
                      <li>- 20 questions per set</li>
                      <li>- Hit the buzzer when you know the answer</li>
                      <li>- +50 points for correct, -200 for wrong</li>
                    </ul>
                  </div>
                </CardBody>
              </Card>

              {/* Leaderboards */}
              <Leaderboards />
            </div>

            {/* Right side: Room List */}
            <div>
              <RoomList />
            </div>
          </div>
        </div>
      </main>
      <LobbyBottomBar isConnected={isConnected} activeUserCount={activeUserCount} />
    </GameBackground>
  );
}

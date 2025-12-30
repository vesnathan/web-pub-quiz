'use client';

import { GameBackground } from './GameBackground';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      <div className="w-2.5 h-2.5 bg-primary-400 rounded-full animate-[bounce_1s_ease-in-out_infinite]" />
      <div className="w-2.5 h-2.5 bg-primary-400 rounded-full animate-[bounce_1s_ease-in-out_0.15s_infinite]" style={{ animationDelay: '0.15s' }} />
      <div className="w-2.5 h-2.5 bg-primary-400 rounded-full animate-[bounce_1s_ease-in-out_0.3s_infinite]" style={{ animationDelay: '0.3s' }} />
    </div>
  );
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <GameBackground className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-4">
        <LoadingDots />
        {message && (
          <p className="text-gray-400 text-sm">{message}</p>
        )}
      </div>
    </GameBackground>
  );
}

"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";

interface GuestSession {
  guestId: string;
  displayName: string;
}

export function useGuestSession() {
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);

  // Create a guest session with a display name (prefixed with "Guest_")
  const createGuestSession = useCallback(
    (displayName: string): GuestSession => {
      const trimmedName = displayName.trim() || "Player";
      const session: GuestSession = {
        guestId: `guest-${uuidv4()}`,
        displayName: `Guest_${trimmedName}`,
      };
      setGuestSession(session);
      return session;
    },
    [],
  );

  // Clear guest session
  const clearGuestSession = useCallback(() => {
    setGuestSession(null);
  }, []);

  return {
    guestSession,
    createGuestSession,
    clearGuestSession,
    isGuest: !!guestSession,
  };
}

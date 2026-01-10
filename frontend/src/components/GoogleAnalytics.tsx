"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { hasAnalyticsConsent } from "./CookieConsent";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

// Declare gtag on window
declare global {
  interface Window {
    gtag: (
      command: "config" | "event" | "js",
      targetId: string | Date,
      config?: Record<string, unknown>,
    ) => void;
    dataLayer: unknown[];
  }
}

function GoogleAnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window.gtag !== "function") return;

    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Track page view
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }, [pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    // Check consent on client side
    setHasConsent(hasAnalyticsConsent());
  }, []);

  // Don't render if no measurement ID or no consent
  if (!GA_MEASUREMENT_ID || !hasConsent) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
      <Suspense fallback={null}>
        <GoogleAnalyticsInner />
      </Suspense>
    </>
  );
}

// Helper function to track custom events
export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number,
) {
  if (
    !GA_MEASUREMENT_ID ||
    typeof window === "undefined" ||
    typeof window.gtag !== "function"
  ) {
    return;
  }

  window.gtag("event", action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// Common event helpers
export const analytics = {
  // Game events
  gameJoined: (roomId: string, isGuest: boolean) => {
    trackEvent("join_room", "game", roomId, isGuest ? 0 : 1);
  },

  gameCompleted: (score: number, questionsAnswered: number) => {
    trackEvent("game_completed", "game", `score_${score}`, questionsAnswered);
  },

  questionAnswered: (correct: boolean, timeMs: number) => {
    trackEvent(
      "question_answered",
      "game",
      correct ? "correct" : "incorrect",
      timeMs,
    );
  },

  // Auth events
  signUp: (method: "email" | "google") => {
    trackEvent("sign_up", "auth", method);
  },

  signIn: (method: "email" | "google") => {
    trackEvent("login", "auth", method);
  },

  // Subscription events
  subscriptionStarted: (tier: string) => {
    trackEvent("subscription_started", "monetization", tier);
  },
};

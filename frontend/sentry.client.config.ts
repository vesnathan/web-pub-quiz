import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session Replay - capture 10% of sessions, 100% on error
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Set environment
  environment: process.env.NODE_ENV,

  // Filter out noisy errors
  ignoreErrors: [
    // Browser extensions
    /extensions\//i,
    /^chrome-extension:\/\//i,
    // Network errors that aren't actionable
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    // User aborted requests
    "AbortError",
    // Ably connection issues (handled separately)
    /ably/i,
  ],

  // Add integrations
  integrations: [
    Sentry.replayIntegration({
      // Mask all text and block all media for privacy
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Before sending, add user context
  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV !== "production") {
      return null;
    }
    return event;
  },
});

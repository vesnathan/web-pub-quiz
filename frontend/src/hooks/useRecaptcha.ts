"use client";

import { useCallback, useEffect, useRef } from "react";

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

/**
 * Hook for reCAPTCHA v3 integration
 * Loads the reCAPTCHA script and provides a function to execute verification
 */
export function useRecaptcha() {
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Don't load if already loaded or no site key
    if (scriptLoadedRef.current || !RECAPTCHA_SITE_KEY) return;

    // Check if script already exists
    if (document.querySelector(`script[src*="recaptcha"]`)) {
      scriptLoadedRef.current = true;
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      scriptLoadedRef.current = true;
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount as other components might use it
    };
  }, []);

  /**
   * Execute reCAPTCHA verification
   * @param action - The action name for analytics (e.g., "send_invite")
   * @returns The reCAPTCHA token or null if verification fails
   */
  const executeRecaptcha = useCallback(
    async (action: string): Promise<string | null> => {
      if (!RECAPTCHA_SITE_KEY) {
        console.error("reCAPTCHA site key not configured");
        return null;
      }

      return new Promise((resolve) => {
        if (!window.grecaptcha) {
          console.error("reCAPTCHA not loaded");
          resolve(null);
          return;
        }

        window.grecaptcha.ready(async () => {
          try {
            const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
              action,
            });
            resolve(token);
          } catch (error) {
            console.error("reCAPTCHA execution failed:", error);
            resolve(null);
          }
        });
      });
    },
    [],
  );

  return {
    executeRecaptcha,
    isReady: scriptLoadedRef.current,
    isConfigured: !!RECAPTCHA_SITE_KEY,
  };
}

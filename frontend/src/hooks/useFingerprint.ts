"use client";

import { useState, useEffect } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";

const FINGERPRINT_KEY = "qnl_device_fp";

/**
 * Hook to generate and cache a device fingerprint.
 * Uses FingerprintJS to create a stable identifier across sessions.
 */
export function useFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadFingerprint() {
      // Check cache first
      const cached = localStorage.getItem(FINGERPRINT_KEY);
      if (cached) {
        setFingerprint(cached);
        setIsLoading(false);
        return;
      }

      try {
        // Generate new fingerprint
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const visitorId = result.visitorId;

        // Cache it
        localStorage.setItem(FINGERPRINT_KEY, visitorId);
        setFingerprint(visitorId);
      } catch (error) {
        console.error("Failed to generate fingerprint:", error);
        // Fallback to a random ID if fingerprinting fails
        const fallbackId = `fallback-${crypto.randomUUID()}`;
        localStorage.setItem(FINGERPRINT_KEY, fallbackId);
        setFingerprint(fallbackId);
      } finally {
        setIsLoading(false);
      }
    }

    loadFingerprint();
  }, []);

  return { fingerprint, isLoading };
}

/**
 * Get fingerprint synchronously from cache (may be null if not yet generated)
 */
export function getCachedFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(FINGERPRINT_KEY);
}

"use client";

import { useEffect, useCallback } from "react";
import { generateClient } from "aws-amplify/api";
import { RECORD_REFERRAL } from "@/graphql/mutations";

const client = generateClient();

const REFERRAL_STORAGE_KEY = "qnl_referrer_id";

/**
 * Hook for managing referral tracking
 *
 * - Captures referral ID from URL (?ref=userId) and stores in localStorage
 * - Provides function to record referral after user registration
 */
export function useReferral() {
  // Check for referral parameter in URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const referrerId = urlParams.get("ref");

    if (referrerId) {
      // Store referrer ID in localStorage
      localStorage.setItem(REFERRAL_STORAGE_KEY, referrerId);

      // Clean up URL (remove ref parameter without page reload)
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  /**
   * Get the stored referrer ID
   */
  const getReferrerId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(REFERRAL_STORAGE_KEY);
  }, []);

  /**
   * Record the referral after user registration
   * Should be called after the user successfully signs up and confirms their account
   */
  const recordReferral = useCallback(async (): Promise<boolean> => {
    const referrerId = getReferrerId();

    if (!referrerId) {
      return false;
    }

    try {
      await client.graphql({
        query: RECORD_REFERRAL,
        variables: { referrerId },
      });

      // Clear the stored referrer ID after successful recording
      localStorage.removeItem(REFERRAL_STORAGE_KEY);

      console.log("Referral recorded successfully for referrer:", referrerId);
      return true;
    } catch (error) {
      console.error("Failed to record referral:", error);
      // Don't throw - referral tracking is not critical
      return false;
    }
  }, [getReferrerId]);

  /**
   * Clear the stored referrer ID (e.g., if user declines or on timeout)
   */
  const clearReferrerId = useCallback(() => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
  }, []);

  return {
    getReferrerId,
    recordReferral,
    clearReferrerId,
  };
}

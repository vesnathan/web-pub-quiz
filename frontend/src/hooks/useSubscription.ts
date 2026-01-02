"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getMyProfile, createCheckoutSession } from "@/lib/api";
import type {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionInfo,
  SubscriptionFeatures,
  SubscriptionProvider,
} from "@quiz/shared";
import {
  DEFAULT_SUBSCRIPTION_INFO,
  getSubscriptionFeatures,
  FREE_TIER_DAILY_SET_LIMIT,
} from "@quiz/shared";

interface GiftInfo {
  giftedBy: string | null;
  giftedByName: string | null;
  giftedAt: string | null;
  giftExpiresAt: string | null;
  giftNotificationSeen: boolean;
}

interface UseSubscriptionReturn {
  // Subscription info
  tier: SubscriptionTier;
  tierName: string;
  status: SubscriptionStatus | null;
  isSubscribed: boolean;
  subscription: SubscriptionInfo;

  // Features
  features: SubscriptionFeatures;
  hasUnlimitedSets: boolean;
  isAdFree: boolean;
  canCreatePrivateRooms: boolean;
  canCreateCustomQuizzes: boolean;

  // Daily limit tracking (for free tier)
  setsPlayedToday: number;
  setsRemainingToday: number;
  canPlaySet: boolean;
  nextResetTime: Date;

  // Gift subscription info
  giftInfo: GiftInfo;
  hasUnseenGift: boolean;

  // Actions
  refreshSubscription: () => Promise<void>;
  recordSetPlayed: () => Promise<void>;
  createCheckout: (
    tier: SubscriptionTier,
    provider: SubscriptionProvider,
  ) => Promise<string | null>;

  // Loading state
  isLoading: boolean;
}

const TIER_NAMES: Record<SubscriptionTier, string> = {
  0: "Free",
  1: "Supporter",
  2: "Champion",
};

// Get midnight in user's local timezone
function getMidnightToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

function getMidnightTomorrow(): Date {
  const midnight = getMidnightToday();
  midnight.setDate(midnight.getDate() + 1);
  return midnight;
}

const DEFAULT_GIFT_INFO: GiftInfo = {
  giftedBy: null,
  giftedByName: null,
  giftedAt: null,
  giftExpiresAt: null,
  giftNotificationSeen: true, // Default to true so no modal shows
};

export function useSubscription(): UseSubscriptionReturn {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo>(
    DEFAULT_SUBSCRIPTION_INFO,
  );
  const [giftInfo, setGiftInfo] = useState<GiftInfo>(DEFAULT_GIFT_INFO);
  const [setsPlayedToday, setSetsPlayedToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Derived values
  const tier = subscription.tier;
  const tierName = TIER_NAMES[tier];
  const status = subscription.status;
  const isSubscribed = tier > 0 && status === "active";

  // Features based on tier
  const features = useMemo(() => getSubscriptionFeatures(tier), [tier]);
  const hasUnlimitedSets = features.unlimitedSets;
  const isAdFree = features.adFree;
  const canCreatePrivateRooms = features.privateRooms;
  const canCreateCustomQuizzes = features.customQuizzes;

  // Daily limit calculations
  const setsRemainingToday = hasUnlimitedSets
    ? Infinity
    : Math.max(0, FREE_TIER_DAILY_SET_LIMIT - setsPlayedToday);
  const canPlaySet = hasUnlimitedSets || setsRemainingToday > 0;
  const nextResetTime = getMidnightTomorrow();

  // Fetch subscription data from GraphQL API
  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSubscription(DEFAULT_SUBSCRIPTION_INFO);
      setGiftInfo(DEFAULT_GIFT_INFO);
      setSetsPlayedToday(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const profileData = await getMyProfile();
      if (profileData?.subscription) {
        const sub = profileData.subscription;
        setSubscription({
          tier: (sub.tier ?? 0) as SubscriptionTier,
          status: sub.status as SubscriptionStatus,
          provider: sub.provider as SubscriptionProvider,
          subscriptionId: sub.subscriptionId ?? null,
          customerId: sub.customerId ?? null,
          startedAt: sub.startedAt ?? null,
          expiresAt: sub.expiresAt ?? null,
          cancelledAt: sub.cancelledAt ?? null,
        });

        // Set gift info
        setGiftInfo({
          giftedBy: sub.giftedBy ?? null,
          giftedByName: sub.giftedByName ?? null,
          giftedAt: sub.giftedAt ?? null,
          giftExpiresAt: sub.giftExpiresAt ?? null,
          giftNotificationSeen: sub.giftNotificationSeen ?? true,
        });
      } else {
        setSubscription(DEFAULT_SUBSCRIPTION_INFO);
        setGiftInfo(DEFAULT_GIFT_INFO);
      }

      // Check sets played today (still use localStorage for daily tracking)
      const today = getMidnightToday().toISOString().split("T")[0];
      const storedSetsKey = `setsPlayed_${user.userId}_${today}`;
      const storedSets = localStorage.getItem(storedSetsKey);
      if (storedSets) {
        setSetsPlayedToday(parseInt(storedSets, 10));
      } else {
        setSetsPlayedToday(0);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      setSubscription(DEFAULT_SUBSCRIPTION_INFO);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Record a set played (for free tier limit tracking)
  const recordSetPlayed = useCallback(async () => {
    if (!user) return;

    // If unlimited sets, no need to track
    if (hasUnlimitedSets) return;

    const newCount = setsPlayedToday + 1;
    setSetsPlayedToday(newCount);

    // Store in localStorage for persistence
    const today = getMidnightToday().toISOString().split("T")[0];
    const storedSetsKey = `setsPlayed_${user.userId}_${today}`;
    localStorage.setItem(storedSetsKey, newCount.toString());
  }, [user, hasUnlimitedSets, setsPlayedToday]);

  // Create a checkout session for subscription
  const createCheckout = useCallback(
    async (
      checkoutTier: SubscriptionTier,
      provider: SubscriptionProvider,
    ): Promise<string | null> => {
      if (!isAuthenticated) {
        console.error("Must be authenticated to create checkout");
        return null;
      }

      try {
        const successUrl = `${window.location.origin}/subscribe?success=true`;
        const cancelUrl = `${window.location.origin}/subscribe?cancelled=true`;

        const result = await createCheckoutSession({
          tier: checkoutTier,
          provider,
          successUrl,
          cancelUrl,
        });

        if (result?.checkoutUrl) {
          return result.checkoutUrl;
        }

        console.error("No checkout URL returned");
        return null;
      } catch (error) {
        console.error("Failed to create checkout session:", error);
        return null;
      }
    },
    [isAuthenticated],
  );

  // Initial fetch
  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  // Check for day change and reset counter
  useEffect(() => {
    const checkDayChange = () => {
      const now = new Date();
      const midnight = getMidnightTomorrow();
      const timeUntilMidnight = midnight.getTime() - now.getTime();

      // Set timeout to refresh at midnight
      const timeout = setTimeout(() => {
        setSetsPlayedToday(0);
        // Clean up old localStorage entries
        if (user) {
          const yesterday = new Date(getMidnightToday());
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = `setsPlayed_${user.userId}_${yesterday.toISOString().split("T")[0]}`;
          localStorage.removeItem(yesterdayKey);
        }
      }, timeUntilMidnight);

      return () => clearTimeout(timeout);
    };

    return checkDayChange();
  }, [user]);

  // Compute hasUnseenGift - true if there's a gift and user hasn't seen the notification
  const hasUnseenGift =
    !giftInfo.giftNotificationSeen && giftInfo.giftedBy !== null;

  return {
    tier,
    tierName,
    status,
    isSubscribed,
    subscription,
    features,
    hasUnlimitedSets,
    isAdFree,
    canCreatePrivateRooms,
    canCreateCustomQuizzes,
    setsPlayedToday,
    setsRemainingToday,
    canPlaySet,
    nextResetTime,
    giftInfo,
    hasUnseenGift,
    refreshSubscription,
    recordSetPlayed,
    createCheckout,
    isLoading,
  };
}

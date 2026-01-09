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
  FREE_TIER_DAILY_QUESTION_LIMIT,
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
  hasUnlimitedQuestions: boolean;
  isAdFree: boolean;
  canCreatePrivateRooms: boolean;
  canCreateCustomQuizzes: boolean;

  // Daily limit tracking (for free tier)
  questionsAnsweredToday: number;
  questionsRemainingToday: number;
  canAnswerQuestions: boolean;
  nextResetTime: Date;

  // Gift subscription info
  giftInfo: GiftInfo;
  hasUnseenGift: boolean;

  // Actions
  refreshSubscription: () => Promise<void>;
  recordQuestionAnswered: () => void;
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
  const [questionsAnsweredToday, setQuestionsAnsweredToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Derived values
  const tier = subscription.tier;
  const tierName = TIER_NAMES[tier];
  const status = subscription.status;
  const isSubscribed = tier > 0 && status === "active";

  // Features based on tier
  const features = useMemo(() => getSubscriptionFeatures(tier), [tier]);
  const hasUnlimitedQuestions = features.unlimitedQuestions;
  const isAdFree = features.adFree;
  const canCreatePrivateRooms = features.privateRooms;
  const canCreateCustomQuizzes = features.customQuizzes;

  // Daily limit calculations
  const questionsRemainingToday = hasUnlimitedQuestions
    ? Infinity
    : Math.max(0, FREE_TIER_DAILY_QUESTION_LIMIT - questionsAnsweredToday);
  const canAnswerQuestions =
    hasUnlimitedQuestions || questionsRemainingToday > 0;
  const nextResetTime = getMidnightTomorrow();

  // Get localStorage key for tracking questions (works for both users and guests)
  const getQuestionsKey = useCallback(() => {
    const today = getMidnightToday().toISOString().split("T")[0];
    const identifier = user?.userId || "guest";
    return `questionsAnswered_${identifier}_${today}`;
  }, [user?.userId]);

  // Fetch subscription data from GraphQL API
  const refreshSubscription = useCallback(async () => {
    // For guests, just load their question count from localStorage
    if (!isAuthenticated || !user) {
      setSubscription(DEFAULT_SUBSCRIPTION_INFO);
      setGiftInfo(DEFAULT_GIFT_INFO);

      // Load guest question count from localStorage
      const storedQuestions = localStorage.getItem(getQuestionsKey());
      if (storedQuestions) {
        setQuestionsAnsweredToday(parseInt(storedQuestions, 10));
      } else {
        setQuestionsAnsweredToday(0);
      }
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

      // Check questions answered today (use localStorage for daily tracking)
      const storedQuestions = localStorage.getItem(getQuestionsKey());
      if (storedQuestions) {
        setQuestionsAnsweredToday(parseInt(storedQuestions, 10));
      } else {
        setQuestionsAnsweredToday(0);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
      setSubscription(DEFAULT_SUBSCRIPTION_INFO);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, getQuestionsKey]);

  // Record a question answered (for free tier limit tracking - works for guests too)
  const recordQuestionAnswered = useCallback(() => {
    // If unlimited questions, no need to track
    if (hasUnlimitedQuestions) return;

    const newCount = questionsAnsweredToday + 1;
    setQuestionsAnsweredToday(newCount);

    // Store in localStorage for persistence (works for both users and guests)
    localStorage.setItem(getQuestionsKey(), newCount.toString());
  }, [hasUnlimitedQuestions, questionsAnsweredToday, getQuestionsKey]);

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
        setQuestionsAnsweredToday(0);
        // Clean up old localStorage entries (for both users and guests)
        const yesterday = new Date(getMidnightToday());
        yesterday.setDate(yesterday.getDate() - 1);
        const identifier = user?.userId || "guest";
        const yesterdayKey = `questionsAnswered_${identifier}_${yesterday.toISOString().split("T")[0]}`;
        localStorage.removeItem(yesterdayKey);
      }, timeUntilMidnight);

      return () => clearTimeout(timeout);
    };

    return checkDayChange();
  }, [user?.userId]);

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
    hasUnlimitedQuestions,
    isAdFree,
    canCreatePrivateRooms,
    canCreateCustomQuizzes,
    questionsAnsweredToday,
    questionsRemainingToday,
    canAnswerQuestions,
    nextResetTime,
    giftInfo,
    hasUnseenGift,
    refreshSubscription,
    recordQuestionAnswered,
    createCheckout,
    isLoading,
  };
}

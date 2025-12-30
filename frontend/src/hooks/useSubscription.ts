'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type {
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionInfo,
  SubscriptionFeatures,
} from '@quiz/shared';
import {
  DEFAULT_SUBSCRIPTION_INFO,
  getSubscriptionFeatures,
  FREE_TIER_DAILY_SET_LIMIT,
} from '@quiz/shared';

interface UseSubscriptionReturn {
  // Subscription info
  tier: SubscriptionTier;
  tierName: string;
  status: SubscriptionStatus;
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

  // Actions
  refreshSubscription: () => Promise<void>;
  recordSetPlayed: () => Promise<void>;

  // Loading state
  isLoading: boolean;
}

const TIER_NAMES: Record<SubscriptionTier, string> = {
  0: 'Free',
  1: 'Supporter',
  2: 'Champion',
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

export function useSubscription(): UseSubscriptionReturn {
  const { user, isAuthenticated } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo>(DEFAULT_SUBSCRIPTION_INFO);
  const [setsPlayedToday, setSetsPlayedToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Derived values
  const tier = subscription.tier;
  const tierName = TIER_NAMES[tier];
  const status = subscription.status;
  const isSubscribed = tier > 0 && status === 'active';

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

  // Fetch subscription data from user profile
  const refreshSubscription = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setSubscription(DEFAULT_SUBSCRIPTION_INFO);
      setSetsPlayedToday(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Fetch from AppSync/API
      // For now, use mock data or localStorage
      const storedSubscription = localStorage.getItem(`subscription_${user.userId}`);
      if (storedSubscription) {
        setSubscription(JSON.parse(storedSubscription));
      }

      // Check sets played today
      const today = getMidnightToday().toISOString().split('T')[0];
      const storedSetsKey = `setsPlayed_${user.userId}_${today}`;
      const storedSets = localStorage.getItem(storedSetsKey);
      if (storedSets) {
        setSetsPlayedToday(parseInt(storedSets, 10));
      } else {
        setSetsPlayedToday(0);
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error);
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
    const today = getMidnightToday().toISOString().split('T')[0];
    const storedSetsKey = `setsPlayed_${user.userId}_${today}`;
    localStorage.setItem(storedSetsKey, newCount.toString());

    // TODO: Also update backend via AppSync
  }, [user, hasUnlimitedSets, setsPlayedToday]);

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
          const yesterdayKey = `setsPlayed_${user.userId}_${yesterday.toISOString().split('T')[0]}`;
          localStorage.removeItem(yesterdayKey);
        }
      }, timeUntilMidnight);

      return () => clearTimeout(timeout);
    };

    return checkDayChange();
  }, [user]);

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
    refreshSubscription,
    recordSetPlayed,
    isLoading,
  };
}

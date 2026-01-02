"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Divider,
} from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { createCheckoutSession } from "@/lib/api";
import type { SubscriptionTier } from "@quiz/shared";
import { SubscriptionProvider } from "@quiz/shared";

interface TierInfo {
  id: SubscriptionTier;
  name: string;
  price: string;
  priceNote?: string;
  popular?: boolean;
  features: string[];
  notIncluded?: string[];
}

const TIERS: TierInfo[] = [
  {
    id: 0,
    name: "Free",
    price: "$0",
    priceNote: "forever",
    features: [
      "3 quiz sets per day",
      "Compete on public leaderboards",
      "Earn badges and achievements",
    ],
    notIncluded: [
      "Unlimited sets",
      "Ad-free experience",
      "Patron badge",
      "Private rooms",
    ],
  },
  {
    id: 1,
    name: "Supporter",
    price: "$3",
    priceNote: "per month",
    popular: true,
    features: [
      "Unlimited quiz sets",
      "Exclusive Patron badge",
      "Patron-only leaderboard",
      "Support QuizNight development",
    ],
    notIncluded: ["Ad-free experience", "Private rooms", "Custom quizzes"],
  },
  {
    id: 2,
    name: "Champion",
    price: "$10",
    priceNote: "per month",
    features: [
      "Everything in Supporter",
      "Ad-free experience",
      "Create private rooms",
      "Host custom quizzes",
      "Name in Credits page",
      "Priority support",
    ],
  },
];

function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-green-400 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-5 h-5 text-gray-500 flex-shrink-0"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface TierCardProps {
  tier: TierInfo;
  currentTier?: SubscriptionTier;
  onSelect: (tier: SubscriptionTier, provider: SubscriptionProvider) => void;
  loadingState: {
    tier: SubscriptionTier;
    provider: SubscriptionProvider;
  } | null;
}

function TierCard({
  tier,
  currentTier,
  onSelect,
  loadingState,
}: TierCardProps) {
  const isCurrentTier = currentTier === tier.id;
  const isUpgrade = currentTier !== undefined && tier.id > currentTier;
  const isDowngrade =
    currentTier !== undefined && tier.id < currentTier && tier.id !== 0;
  const isFree = tier.id === 0;

  return (
    <Card
      className={`bg-gray-800/70 backdrop-blur border-2 transition-all ${
        tier.popular
          ? "border-primary-500 scale-105"
          : isCurrentTier
            ? "border-green-500"
            : "border-gray-700"
      }`}
    >
      <CardHeader className="flex flex-col items-center pt-6 pb-2">
        {tier.popular && (
          <Chip color="primary" size="sm" className="mb-2">
            Most Popular
          </Chip>
        )}
        {isCurrentTier && (
          <Chip color="success" size="sm" className="mb-2">
            Current Plan
          </Chip>
        )}
        <h3 className="text-2xl font-bold text-white">{tier.name}</h3>
        <div className="flex items-baseline mt-2">
          <span className="text-4xl font-bold text-white">{tier.price}</span>
          {tier.priceNote && (
            <span className="text-gray-400 ml-2">/{tier.priceNote}</span>
          )}
        </div>
      </CardHeader>

      <Divider className="bg-gray-700" />

      <CardBody className="py-6">
        <ul className="space-y-3 mb-6">
          {tier.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <CheckIcon />
              <span className="text-gray-200">{feature}</span>
            </li>
          ))}
          {tier.notIncluded?.map((feature, index) => (
            <li
              key={`not-${index}`}
              className="flex items-start gap-3 opacity-50"
            >
              <XIcon />
              <span className="text-gray-400 line-through">{feature}</span>
            </li>
          ))}
        </ul>

        {!isFree && !isCurrentTier && (
          <div className="space-y-2">
            <Button
              color={tier.popular ? "primary" : "default"}
              variant={tier.popular ? "solid" : "bordered"}
              className="w-full"
              size="lg"
              onPress={() => onSelect(tier.id, SubscriptionProvider.stripe)}
              isLoading={
                loadingState?.tier === tier.id &&
                loadingState?.provider === SubscriptionProvider.stripe
              }
              isDisabled={loadingState !== null}
            >
              {isUpgrade ? "Upgrade" : "Subscribe"} with Card
            </Button>
            <Button
              color="default"
              variant="flat"
              className="w-full"
              size="lg"
              onPress={() => onSelect(tier.id, SubscriptionProvider.paypal)}
              isLoading={
                loadingState?.tier === tier.id &&
                loadingState?.provider === SubscriptionProvider.paypal
              }
              isDisabled={loadingState !== null}
            >
              {isUpgrade ? "Upgrade" : "Subscribe"} with PayPal
            </Button>
          </div>
        )}

        {isCurrentTier && !isFree && (
          <Button
            color="default"
            variant="flat"
            className="w-full"
            size="lg"
            isDisabled
          >
            Current Plan
          </Button>
        )}

        {isFree && !isCurrentTier && (
          <Button
            color="default"
            variant="flat"
            className="w-full"
            size="lg"
            isDisabled
          >
            Free Plan
          </Button>
        )}
      </CardBody>
    </Card>
  );
}

function SubscribePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [loadingState, setLoadingState] = useState<{
    tier: SubscriptionTier;
    provider: SubscriptionProvider;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get current tier from user profile
  const currentTier: SubscriptionTier = (user?.subscription?.tier ??
    0) as SubscriptionTier;

  // Handle success/cancel query params
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMessage(
        "Thank you for subscribing! Your account will be updated shortly.",
      );
      // Clear the query params
      router.replace("/subscribe");
    } else if (searchParams.get("cancelled") === "true") {
      setError("Checkout was cancelled. No charges were made.");
      router.replace("/subscribe");
    }
  }, [searchParams, router]);

  const handleSelectTier = async (
    tier: SubscriptionTier,
    provider: SubscriptionProvider,
  ) => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/?login=true&returnTo=/subscribe`);
      return;
    }

    setLoadingState({ tier, provider });
    setError(null);

    try {
      const baseUrl = window.location.origin;
      const result = await createCheckoutSession({
        tier,
        provider,
        successUrl: `${baseUrl}/subscribe?success=true`,
        cancelUrl: `${baseUrl}/subscribe?cancelled=true`,
      });

      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError("Failed to create checkout session. Please try again.");
      setLoadingState(null);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Support QuizNight.live
            </h1>
            <p className="text-gray-400 mb-3">
              I'm an independent developer, not a huge company. Your support
              directly helps keep QuizNight.live running and improving!
            </p>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Unlock unlimited quiz sets, exclusive features, and help keep the
              servers running. Cancel anytime.
            </p>
          </div>

          {/* Success message */}
          {successMessage && (
            <div className="mb-8 p-4 bg-green-900/50 border border-green-500 rounded-lg text-center">
              <p className="text-green-200">{successMessage}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-8 p-4 bg-red-900/50 border border-red-500 rounded-lg text-center">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Tier cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                currentTier={currentTier}
                onSelect={handleSelectTier}
                loadingState={loadingState}
              />
            ))}
          </div>

          {/* FAQ Section */}
          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                Frequently Asked Questions
              </h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    What happens to my progress if I cancel?
                  </h3>
                  <p className="text-gray-300">
                    Your badges, achievements, and leaderboard history are never
                    deleted. You simply go back to the free tier limits.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Can I change my plan later?
                  </h3>
                  <p className="text-gray-300">
                    Yes! You can upgrade or downgrade at any time. Changes take
                    effect immediately.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    What payment methods do you accept?
                  </h3>
                  <p className="text-gray-300">
                    We accept all major credit/debit cards via Stripe, and
                    PayPal. Both are secure and encrypted.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    How does the 3 sets per day limit work?
                  </h3>
                  <p className="text-gray-300">
                    Free users can play up to 3 quiz sets per day. The counter
                    resets at midnight (your local time). Supporters and
                    Champions have unlimited access.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function SubscribePage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <SubscribePageContent />
    </Suspense>
  );
}

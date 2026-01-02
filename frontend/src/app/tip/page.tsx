"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, Button } from "@nextui-org/react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { createTipCheckout } from "@/lib/api";
import { SubscriptionProvider } from "@quiz/shared";

function TipPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [loadingProvider, setLoadingProvider] =
    useState<SubscriptionProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle success/cancel query params
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessMessage(
        "Thank you for your tip! You now have 24 hours of unlimited quiz sets.",
      );
      router.replace("/tip");
    } else if (searchParams.get("cancelled") === "true") {
      setError("Checkout was cancelled. No charges were made.");
      router.replace("/tip");
    }
  }, [searchParams, router]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/?login=true&returnTo=/tip");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleTip = async (provider: SubscriptionProvider) => {
    setLoadingProvider(provider);
    setError(null);

    try {
      const result = await createTipCheckout(provider);

      if (result?.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Tip checkout error:", err);
      setError("Failed to create checkout. Please try again.");
      setLoadingProvider(null);
    }
  };

  if (authLoading) {
    return <LoadingScreen message="Loading..." />;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen p-4 sm:p-8 flex items-center justify-center">
        <Card className="max-w-md w-full bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur border border-amber-500/30">
          <CardBody className="p-8 text-center">
            <div className="text-6xl mb-4">☕</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Buy Me a Coffee
            </h1>
            <p className="text-gray-300 mb-4">
              I'm an independent developer, not a huge company. Your support
              helps keep QuizNight.live running and improving!
            </p>
            <p className="text-gray-300 mb-6">
              Tip $2 and enjoy{" "}
              <span className="text-amber-300 font-semibold">
                24 hours of unlimited quiz sets
              </span>
              !
            </p>

            {/* Success message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-900/50 border border-green-500 rounded-lg">
                <p className="text-green-200">{successMessage}</p>
                <Button
                  color="success"
                  variant="flat"
                  className="mt-3"
                  onPress={() => router.push("/")}
                >
                  Start Playing
                </Button>
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                <p className="text-red-200">{error}</p>
              </div>
            )}

            {!successMessage && (
              <div className="space-y-3">
                <Button
                  color="warning"
                  size="lg"
                  className="w-full font-semibold"
                  onPress={() => handleTip(SubscriptionProvider.stripe)}
                  isLoading={loadingProvider === SubscriptionProvider.stripe}
                  isDisabled={loadingProvider !== null}
                >
                  Tip $2 with Card
                </Button>
                <Button
                  color="default"
                  variant="bordered"
                  size="lg"
                  className="w-full font-semibold border-amber-500/50 text-amber-200"
                  onPress={() => handleTip(SubscriptionProvider.paypal)}
                  isLoading={loadingProvider === SubscriptionProvider.paypal}
                  isDisabled={loadingProvider !== null}
                >
                  Tip $2 with PayPal
                </Button>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-6">
              One-time payment. No subscription required.
            </p>
          </CardBody>
        </Card>
      </main>
      <Footer />
    </>
  );
}

export default function TipPage() {
  return (
    <Suspense fallback={<LoadingScreen message="Loading..." />}>
      <TipPageContent />
    </Suspense>
  );
}

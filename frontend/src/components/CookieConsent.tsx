"use client";

import { useState, useEffect } from "react";
import { Button } from "@nextui-org/react";
import Link from "next/link";

const CONSENT_KEY = "cookie-consent";

export type CookieConsent = "all" | "essential" | null;

export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === "all" || consent === "essential") {
    return consent;
  }
  return null;
}

export function hasAnalyticsConsent(): boolean {
  return getCookieConsent() === "all";
}

export function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = getCookieConsent();
    if (consent === null) {
      setShowBanner(true);
      // Delay visibility for animation
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem(CONSENT_KEY, "all");
    setIsVisible(false);
    setTimeout(() => {
      setShowBanner(false);
      // Reload to activate Google Analytics
      window.location.reload();
    }, 300);
  };

  const handleEssentialOnly = () => {
    localStorage.setItem(CONSENT_KEY, "essential");
    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  if (!showBanner) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 p-4 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="max-w-4xl mx-auto bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">We use cookies</h3>
            <p className="text-gray-400 text-sm">
              We use essential cookies for site functionality and analytics
              cookies to understand how you use our site.{" "}
              <Link
                href="/privacy"
                className="text-primary-400 hover:underline"
              >
                Learn more
              </Link>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="flat"
              size="sm"
              className="text-gray-300"
              onPress={handleEssentialOnly}
            >
              Essential Only
            </Button>
            <Button color="primary" size="sm" onPress={handleAcceptAll}>
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

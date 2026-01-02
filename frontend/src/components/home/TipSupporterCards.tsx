"use client";

import { Card, CardBody } from "@nextui-org/react";

interface TipSupporterCardsProps {
  /** If authenticated, show tip page link. Otherwise, trigger onAuthRequired */
  isAuthenticated: boolean;
  /** Called when unauthenticated user clicks a card */
  onAuthRequired?: () => void;
  /** If user has active tip unlock, show active state */
  tipUnlockedUntil?: string | null;
}

export function TipSupporterCards({
  isAuthenticated,
  onAuthRequired,
  tipUnlockedUntil,
}: TipSupporterCardsProps) {
  const isTipActive =
    tipUnlockedUntil && new Date(tipUnlockedUntil) > new Date();

  const handleTipPress = () => {
    if (isAuthenticated) {
      window.location.href = "/tip";
    } else {
      onAuthRequired?.();
    }
  };

  const handleSupporterPress = () => {
    window.location.href = "/subscribe";
  };

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Tip Jar */}
      {isTipActive ? (
        <Card className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm border border-green-500/30">
          <CardBody className="p-4 flex flex-col items-center text-center gap-2">
            <div className="text-4xl">✅</div>
            <div>
              <div className="text-sm font-semibold text-green-300">
                Unlimited Active
              </div>
              <div className="text-xs text-gray-400">
                Until{" "}
                {new Date(tipUnlockedUntil!).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </CardBody>
        </Card>
      ) : (
        <Card
          className="bg-gradient-to-br from-amber-900/40 to-orange-900/40 backdrop-blur-sm border border-amber-500/30 cursor-pointer hover:scale-[1.02] transition-transform"
          isPressable
          onPress={handleTipPress}
        >
          <CardBody className="p-4 flex flex-col items-center text-center gap-2">
            <div className="text-4xl">☕</div>
            <div>
              <div className="text-sm font-semibold text-amber-300">
                Buy me a coffee
              </div>
              <div className="text-xs text-gray-400">24hr unlimited sets</div>
              <div className="text-lg font-bold text-amber-400 mt-1">$2</div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Become a Supporter */}
      <Card
        className="bg-gradient-to-br from-primary-900/40 to-purple-900/40 backdrop-blur-sm border border-primary-500/30 cursor-pointer hover:scale-[1.02] transition-transform"
        isPressable
        onPress={handleSupporterPress}
      >
        <CardBody className="p-4 flex flex-col items-center text-center gap-2">
          <div className="text-4xl">⭐</div>
          <div>
            <div className="text-sm font-semibold text-primary-300">
              Become a Supporter
            </div>
            <div className="text-xs text-gray-400">Unlimited sets & badges</div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

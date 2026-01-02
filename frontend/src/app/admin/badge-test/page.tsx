"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Select,
  SelectItem,
  Checkbox,
  CheckboxGroup,
} from "@nextui-org/react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { GameBackground } from "@/components/GameBackground";
import { SetEndScreen, SetEndSidebar } from "@/components/SetEndScreen";
import { BadgeAwardAnimation } from "@/components/badges/BadgeAwardAnimation";
import { BadgeRevolver } from "@/components/badges/BadgeRevolver";
import {
  getAllBadges,
  getBadgeById,
  AWARD_GROUPS,
  type AwardBadge,
  type LeaderboardEntry,
} from "@quiz/shared";

const ADMIN_EMAIL = "vesnathan+qnl-admin@gmail.com";

// Test modes
type TestMode = "single" | "revolver" | "set-end";

// Generate fake leaderboard data
function generateFakeLeaderboard(
  currentPlayerId: string,
  playerName: string,
): LeaderboardEntry[] {
  const names = [
    "QuizMaster",
    "BrainBox",
    "TriviaKing",
    "SmartCookie",
    "FactFinder",
    "KnowledgeNinja",
    "MindBender",
    "WisdomWizard",
  ];

  const entries: LeaderboardEntry[] = [
    {
      rank: 1,
      userId: currentPlayerId,
      username: playerName.toLowerCase().replace(/\s+/g, "_"),
      displayName: playerName,
      score: 150,
    },
    ...names.slice(0, 7).map((name, i) => ({
      rank: i + 2,
      userId: `fake-${i}`,
      username: name.toLowerCase(),
      displayName: name,
      score: 100 - i * 20,
    })),
  ];

  return entries;
}

export default function BadgeTestPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  // Test state
  const [testMode, setTestMode] = useState<TestMode>("single");
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([
    "streak_10",
  ]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentBadge, setCurrentBadge] = useState<AwardBadge | null>(null);
  const [showSetEndScreen, setShowSetEndScreen] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  const handleSingleBadgeTest = useCallback(() => {
    if (selectedBadgeIds.length === 0) return;
    const badge = getBadgeById(selectedBadgeIds[0]);
    if (badge) {
      setCurrentBadge(badge);
      setIsAnimating(true);
    }
  }, [selectedBadgeIds]);

  const handleBadgeAnimationComplete = useCallback(() => {
    setIsAnimating(false);
    setCurrentBadge(null);
  }, []);

  const handleRevolverTest = useCallback(() => {
    if (selectedBadgeIds.length === 0) return;
    setIsAnimating(true);
  }, [selectedBadgeIds]);

  const handleRevolverComplete = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const handleSetEndTest = useCallback(() => {
    setShowSetEndScreen(true);
  }, []);

  const handleBackToControls = useCallback(() => {
    setShowSetEndScreen(false);
    setIsAnimating(false);
    setCurrentBadge(null);
  }, []);

  // Quick select helpers
  const handleSelectAllInGroup = (groupId: string) => {
    const group = AWARD_GROUPS.find((g) => g.id === groupId);
    if (group) {
      const groupBadgeIds = group.badges.map((b) => b.id);
      setSelectedBadgeIds((prev) => [...new Set([...prev, ...groupBadgeIds])]);
    }
  };

  const handleSelectRandom = (count: number) => {
    const allBadges = getAllBadges();
    const shuffled = [...allBadges].sort(() => Math.random() - 0.5);
    setSelectedBadgeIds(shuffled.slice(0, count).map((b) => b.id));
  };

  const handleClearSelection = () => {
    setSelectedBadgeIds([]);
  };

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  // Get selected badges as full objects
  const selectedBadges = selectedBadgeIds
    .map((id) => getBadgeById(id))
    .filter((b): b is AwardBadge => b !== undefined);

  // Generate fake data for set end screen
  const fakeLeaderboard = generateFakeLeaderboard(
    user.userId,
    user.name || user.username || "Admin",
  );

  // If showing set end screen, render full-screen game view
  if (showSetEndScreen) {
    return (
      <GameBackground>
        <div className="relative z-10 min-h-screen p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Back button */}
            <Button
              color="warning"
              variant="flat"
              size="sm"
              className="mb-4"
              onPress={handleBackToControls}
            >
              Back to Test Controls
            </Button>

            {/* Main content + Sidebar */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
              <SetEndScreen
                leaderboard={fakeLeaderboard}
                currentPlayerId={user.userId}
                earnedBadgeIds={selectedBadgeIds}
              />
              <SetEndSidebar
                leaderboard={fakeLeaderboard}
                currentPlayerId={user.userId}
              />
            </div>
          </div>
        </div>
      </GameBackground>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Badge Test Mode
          </h1>
          <Button
            variant="light"
            onPress={() => router.push("/admin")}
            className="text-gray-400"
          >
            Back to Admin
          </Button>
        </div>

        {/* Test Mode Selection */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Test Mode</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <Select
              label="Select test mode"
              selectedKeys={[testMode]}
              onSelectionChange={(keys) => {
                const mode = Array.from(keys)[0] as TestMode;
                if (mode) setTestMode(mode);
              }}
              className="max-w-xs"
            >
              <SelectItem key="single" textValue="Single Badge Animation">
                Single Badge Animation
              </SelectItem>
              <SelectItem key="revolver" textValue="Badge Revolver">
                Badge Revolver (Multiple)
              </SelectItem>
              <SelectItem key="set-end" textValue="Set End Screen">
                Set End Screen
              </SelectItem>
            </Select>

            <div className="text-sm text-gray-400">
              {testMode === "single" && (
                <p>
                  Tests the full-screen badge unlock animation for a single
                  badge. Select one badge below.
                </p>
              )}
              {testMode === "revolver" && (
                <p>
                  Tests the badge revolver animation where badges appear one by
                  one and fly into a row. Select multiple badges.
                </p>
              )}
              {testMode === "set-end" && (
                <p>
                  Tests the full Set End Screen with leaderboard, podium, and
                  badge display. Uses fake game data.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Badge Selection */}
        <Card className="bg-gray-800/50">
          <CardHeader className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Select Badges</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() => handleSelectRandom(3)}
              >
                Random 3
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => handleSelectRandom(5)}
              >
                Random 5
              </Button>
              <Button
                size="sm"
                variant="flat"
                color="danger"
                onPress={handleClearSelection}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4 max-h-[500px] overflow-y-auto">
            {AWARD_GROUPS.map((group) => (
              <div key={group.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-300">
                    {group.name}
                  </h3>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-xs"
                    onPress={() => handleSelectAllInGroup(group.id)}
                  >
                    Select all
                  </Button>
                </div>
                <CheckboxGroup
                  value={selectedBadgeIds}
                  onValueChange={setSelectedBadgeIds}
                  orientation="horizontal"
                  className="gap-2 flex-wrap"
                >
                  {group.badges.map((badge) => (
                    <Checkbox
                      key={badge.id}
                      value={badge.id}
                      size="sm"
                      classNames={{
                        base: "bg-gray-700/50 rounded-lg px-2 py-1 max-w-full",
                        label: "text-xs text-white",
                      }}
                    >
                      <span className="mr-1">{badge.icon}</span>
                      {badge.name}
                      <span className="text-gray-500 ml-1">
                        ({badge.rarity})
                      </span>
                    </Checkbox>
                  ))}
                </CheckboxGroup>
                <Divider className="my-3" />
              </div>
            ))}
          </CardBody>
        </Card>

        {/* Selected Badges Summary */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">
              Selected ({selectedBadges.length})
            </h2>
          </CardHeader>
          <Divider />
          <CardBody>
            {selectedBadges.length === 0 ? (
              <p className="text-gray-400 text-center py-4">
                No badges selected. Select badges above to test.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex items-center gap-1 bg-gray-700/50 rounded-lg px-3 py-1"
                  >
                    <span>{badge.icon}</span>
                    <span className="text-sm text-white">{badge.name}</span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Run Test Button */}
        <div className="flex justify-center">
          {testMode === "single" && (
            <Button
              color="primary"
              size="lg"
              className="font-bold"
              isDisabled={selectedBadgeIds.length === 0 || isAnimating}
              onPress={handleSingleBadgeTest}
            >
              Test Single Badge Animation
            </Button>
          )}
          {testMode === "revolver" && (
            <Button
              color="primary"
              size="lg"
              className="font-bold"
              isDisabled={selectedBadgeIds.length === 0 || isAnimating}
              onPress={handleRevolverTest}
            >
              Test Badge Revolver ({selectedBadges.length} badges)
            </Button>
          )}
          {testMode === "set-end" && (
            <Button
              color="primary"
              size="lg"
              className="font-bold"
              isDisabled={selectedBadgeIds.length === 0}
              onPress={handleSetEndTest}
            >
              Show Set End Screen
            </Button>
          )}
        </div>

        {/* Revolver Test Display */}
        {testMode === "revolver" && isAnimating && (
          <Card className="bg-gray-800/50">
            <CardBody className="p-8">
              <BadgeRevolver
                badges={selectedBadges}
                onAllBadgesShown={handleRevolverComplete}
              />
            </CardBody>
          </Card>
        )}
      </div>

      {/* Single Badge Animation Overlay */}
      {testMode === "single" && isAnimating && currentBadge && (
        <BadgeAwardAnimation
          badge={currentBadge}
          onComplete={handleBadgeAnimationComplete}
        />
      )}
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, Avatar, Button } from "@nextui-org/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { getUserProfile } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ReportUserModal } from "@/components/ReportUserModal";
import { AppFooter } from "@/components/AppFooter";
import { LoadingDots } from "@/components/LoadingScreen";

function ProfileContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");
  const { user } = useAuth();
  const [reportModalOpen, setReportModalOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", userId],
    queryFn: () => getUserProfile(userId!),
    enabled: !!userId,
  });

  const isOwnProfile = user?.userId === userId;

  const getInitials = (name: string) => {
    const parts = name.split(/[._-\s]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const getAvatarColor = (id: string) => {
    const colors = [
      "bg-gradient-to-br from-pink-500 to-orange-400",
      "bg-gradient-to-br from-cyan-500 to-blue-500",
      "bg-gradient-to-br from-green-400 to-cyan-500",
      "bg-gradient-to-br from-purple-500 to-pink-500",
      "bg-gradient-to-br from-yellow-400 to-orange-500",
      "bg-gradient-to-br from-indigo-500 to-purple-500",
    ];
    const hash = id
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (!userId) {
    return (
      <Card className="bg-gray-800/50 backdrop-blur">
        <CardBody className="p-8 text-center">
          <p className="text-gray-400">No user specified</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      {isLoading ? (
        <Card className="bg-gray-800/50 backdrop-blur">
          <CardBody className="p-8 flex justify-center">
            <LoadingDots />
          </CardBody>
        </Card>
      ) : !profile ? (
        <Card className="bg-gray-800/50 backdrop-blur">
          <CardBody className="p-8 text-center">
            <p className="text-gray-400">User not found</p>
          </CardBody>
        </Card>
      ) : (
        <>
          {/* Profile Header */}
          <Card className="bg-gray-800/50 backdrop-blur mb-6">
            <CardBody className="p-6">
              <div className="flex items-center gap-6">
                <Avatar
                  className={`w-20 h-20 text-2xl ${getAvatarColor(userId)}`}
                  name={getInitials(profile.displayName)}
                  size="lg"
                />
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-white">
                    {profile.displayName}
                  </h1>
                  {isOwnProfile && (
                    <p className="text-sm text-primary-400">
                      This is your profile
                    </p>
                  )}
                </div>
                {!isOwnProfile && (
                  <Button
                    color="danger"
                    variant="flat"
                    size="sm"
                    onPress={() => setReportModalOpen(true)}
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                        />
                      </svg>
                    }
                  >
                    Report
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Stats */}
          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6">
              <h2 className="text-lg font-semibold text-white mb-4">
                Statistics
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {profile.stats.totalCorrect}
                  </p>
                  <p className="text-xs text-gray-400">Correct</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-400">
                    {profile.stats.totalWrong}
                  </p>
                  <p className="text-xs text-gray-400">Wrong</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                  <p
                    className={`text-2xl font-bold ${
                      profile.stats.totalPoints >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {profile.stats.totalPoints >= 0 ? "+" : ""}
                    {profile.stats.totalPoints}
                  </p>
                  <p className="text-xs text-gray-400">Total Points</p>
                </div>
                <div className="bg-gray-900/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-400">
                    {profile.stats.longestStreak}
                  </p>
                  <p className="text-xs text-gray-400">Best Streak</p>
                </div>
              </div>

              {profile.stats.setsPlayed > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Games Played</span>
                    <span className="text-white">
                      {profile.stats.setsPlayed}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-400">Games Won</span>
                    <span className="text-white">{profile.stats.setsWon}</span>
                  </div>
                  {profile.stats.setsPlayed > 0 && (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-400">Win Rate</span>
                      <span className="text-white">
                        {Math.round(
                          (profile.stats.setsWon / profile.stats.setsPlayed) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Report Modal */}
          <ReportUserModal
            isOpen={reportModalOpen}
            onClose={() => setReportModalOpen(false)}
            targetUser={{
              id: userId,
              displayName: profile.displayName,
            }}
            context="PROFILE"
          />
        </>
      )}
    </>
  );
}

export default function ProfilePage() {
  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Lobby
          </Link>

          <Suspense
            fallback={
              <Card className="bg-gray-800/50 backdrop-blur">
                <CardBody className="p-8 flex justify-center">
                  <LoadingDots />
                </CardBody>
              </Card>
            }
          >
            <ProfileContent />
          </Suspense>
        </div>
      </main>

      <AppFooter hideConnectionStatus />
    </>
  );
}

"use client";

import { useState } from "react";
import { Card, CardBody, Tabs, Tab, Spinner } from "@nextui-org/react";
import { useLeaderboard } from "@/hooks/queries";
import { LeaderboardType } from "@quiz/shared";

// Tab key to API type mapping
const tabToType: Record<string, LeaderboardType> = {
  daily: LeaderboardType.DAILY,
  weekly: LeaderboardType.WEEKLY,
  allTime: LeaderboardType.ALL_TIME,
};

export function Leaderboards() {
  const [selectedTab, setSelectedTab] = useState<string>("daily");
  const leaderboardType = tabToType[selectedTab] ?? LeaderboardType.DAILY;

  const { data, isLoading, error } = useLeaderboard(leaderboardType, 10);
  const entries = data?.entries ?? [];

  const handleTabChange = (key: React.Key) => {
    setSelectedTab(key as string);
  };

  return (
    <Card className="bg-gray-800/50 backdrop-blur">
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Leaderboards</h2>
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={handleTabChange}
            size="sm"
            classNames={{
              tabList: "bg-gray-700/50",
              cursor: "bg-primary-600",
              tab: "text-gray-300 text-xs",
              tabContent: "group-data-[selected=true]:text-white",
            }}
          >
            <Tab key="daily" title="Today" />
            <Tab key="weekly" title="This Week" />
            <Tab key="allTime" title="All Time" />
          </Tabs>
        </div>

        <div className="mt-4 space-y-2 min-h-[200px]">
          {isLoading ? (
            <div className="flex justify-center items-center h-[200px]">
              <Spinner color="primary" />
            </div>
          ) : error ? (
            <div className="text-center text-red-400 py-8">
              {error instanceof Error
                ? error.message
                : "Failed to load leaderboard"}
            </div>
          ) : (
            <>
              {/* Render actual entries */}
              {entries.map((entry) => (
                <div
                  key={entry.userId}
                  className="leaderboard-entry flex items-center"
                >
                  <div className="w-8 text-center font-bold text-gray-400">
                    {entry.rank}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-700 ml-2 flex items-center justify-center text-gray-400 text-xs">
                    {entry.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 ml-3">
                    <div className="font-semibold text-white">
                      {entry.displayName}
                    </div>
                  </div>
                  <div className="font-bold text-primary-400 font-mono">
                    {entry.score.toLocaleString()}
                  </div>
                </div>
              ))}
              {/* Render placeholder rows to fill up to 5 spots */}
              {Array.from({ length: Math.max(0, 5 - entries.length) }).map(
                (_, index) => (
                  <div
                    key={`placeholder-${index}`}
                    className="leaderboard-entry flex items-center opacity-40"
                  >
                    <div className="w-8 text-center font-bold text-gray-500">
                      {entries.length + index + 1}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-700/50 ml-2 flex items-center justify-center text-gray-500 text-xs">
                      ?
                    </div>
                    <div className="flex-1 ml-3">
                      <div className="font-semibold text-gray-500 italic">
                        Waiting for player...
                      </div>
                    </div>
                    <div className="font-bold text-gray-500 font-mono">-</div>
                  </div>
                ),
              )}
            </>
          )}
        </div>

        {!isLoading && entries.length > 0 && (
          <div className="mt-4 text-center text-sm text-gray-500">
            Top {entries.length} players
          </div>
        )}
      </CardBody>
    </Card>
  );
}

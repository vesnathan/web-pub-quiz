"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Divider,
  Input,
  Switch,
  Chip,
} from "@nextui-org/react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGameConfig,
  updateGameConfig,
  type GameConfig,
  type UpdateGameConfigInput,
} from "@/lib/api/admin";

const ADMIN_EMAIL = "vesnathan+qnl-admin@gmail.com";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [maxPlayersPerRoom, setMaxPlayersPerRoom] = useState("20");
  const [playersPerRoomThreshold, setPlayersPerRoomThreshold] = useState("20");
  const [resultsDisplayMs, setResultsDisplayMs] = useState("5000");
  const [questionDurationMs, setQuestionDurationMs] = useState("10000");
  const [freeTierDailyLimit, setFreeTierDailyLimit] = useState("50");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");

  // Difficulty points
  const [easyCorrect, setEasyCorrect] = useState("50");
  const [easyWrong, setEasyWrong] = useState("-200");
  const [mediumCorrect, setMediumCorrect] = useState("75");
  const [mediumWrong, setMediumWrong] = useState("-100");
  const [hardCorrect, setHardCorrect] = useState("100");
  const [hardWrong, setHardWrong] = useState("-50");

  const loadConfig = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getGameConfig();
      if (result) {
        setConfig(result);
        setMaxPlayersPerRoom(String(result.maxPlayersPerRoom));
        setPlayersPerRoomThreshold(String(result.playersPerRoomThreshold));
        setResultsDisplayMs(String(result.resultsDisplayMs));
        setQuestionDurationMs(String(result.questionDurationMs));
        setFreeTierDailyLimit(String(result.freeTierDailyLimit));
        setMaintenanceMode(result.maintenanceMode);
        setMaintenanceMessage(result.maintenanceMessage || "");
        setEasyCorrect(String(result.difficultyPoints.easy.correct));
        setEasyWrong(String(result.difficultyPoints.easy.wrong));
        setMediumCorrect(String(result.difficultyPoints.medium.correct));
        setMediumWrong(String(result.difficultyPoints.medium.wrong));
        setHardCorrect(String(result.difficultyPoints.hard.correct));
        setHardWrong(String(result.difficultyPoints.hard.wrong));
      }
    } catch (error) {
      console.error("Failed to load config:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const input: UpdateGameConfigInput = {
        maxPlayersPerRoom: parseInt(maxPlayersPerRoom, 10),
        playersPerRoomThreshold: parseInt(playersPerRoomThreshold, 10),
        resultsDisplayMs: parseInt(resultsDisplayMs, 10),
        questionDurationMs: parseInt(questionDurationMs, 10),
        freeTierDailyLimit: parseInt(freeTierDailyLimit, 10),
        maintenanceMode,
        maintenanceMessage: maintenanceMessage || null,
        difficultyPoints: {
          easy: {
            correct: parseInt(easyCorrect, 10),
            wrong: parseInt(easyWrong, 10),
          },
          medium: {
            correct: parseInt(mediumCorrect, 10),
            wrong: parseInt(mediumWrong, 10),
          },
          hard: {
            correct: parseInt(hardCorrect, 10),
            wrong: parseInt(hardWrong, 10),
          },
        },
      };

      const result = await updateGameConfig(input);
      if (result) {
        setConfig(result);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      setSaveError("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  }, [
    maxPlayersPerRoom,
    playersPerRoomThreshold,
    resultsDisplayMs,
    questionDurationMs,
    freeTierDailyLimit,
    maintenanceMode,
    maintenanceMessage,
    easyCorrect,
    easyWrong,
    mediumCorrect,
    mediumWrong,
    hardCorrect,
    hardWrong,
  ]);

  // Load config on mount
  useEffect(() => {
    if (user?.email === ADMIN_EMAIL) {
      loadConfig();
    }
  }, [user?.email, loadConfig]);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || user.email !== ADMIN_EMAIL)) {
      router.push("/");
    }
  }, [authLoading, user, router]);

  if (authLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!user || user.email !== ADMIN_EMAIL) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            Game Settings
          </h1>
          <Button
            variant="light"
            onPress={() => router.push("/admin")}
            className="text-gray-400"
          >
            Back to Admin
          </Button>
        </div>

        <p className="text-gray-400">
          Changes take effect within 60 seconds (orchestrator refresh interval).
        </p>

        {/* Room Settings */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Room Settings</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Max Players Per Room"
                type="number"
                value={maxPlayersPerRoom}
                onValueChange={setMaxPlayersPerRoom}
                description="Maximum players allowed in one room"
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50",
                }}
              />
              <Input
                label="Players Per Room Threshold"
                type="number"
                value={playersPerRoomThreshold}
                onValueChange={setPlayersPerRoomThreshold}
                description="When to create new rooms"
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50",
                }}
              />
            </div>
          </CardBody>
        </Card>

        {/* Timing Settings */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Timing</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Results Display (ms)"
                type="number"
                value={resultsDisplayMs}
                onValueChange={setResultsDisplayMs}
                description="Time to show results screen"
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50",
                }}
              />
              <Input
                label="Question Duration (ms)"
                type="number"
                value={questionDurationMs}
                onValueChange={setQuestionDurationMs}
                description="Time to answer each question"
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50",
                }}
              />
            </div>
          </CardBody>
        </Card>

        {/* Free Tier Settings */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Free Tier</h2>
          </CardHeader>
          <Divider />
          <CardBody>
            <Input
              label="Daily Question Limit"
              type="number"
              value={freeTierDailyLimit}
              onValueChange={setFreeTierDailyLimit}
              description="Max questions per day for free/guest users"
              className="max-w-xs"
              classNames={{
                input: "text-white",
                inputWrapper: "bg-gray-700/50",
              }}
            />
          </CardBody>
        </Card>

        {/* Scoring */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">
              Scoring (Points)
            </h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-green-400 mb-2">
                  Easy
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Correct"
                    type="number"
                    value={easyCorrect}
                    onValueChange={setEasyCorrect}
                    classNames={{
                      input: "text-white",
                      inputWrapper: "bg-gray-700/50",
                    }}
                  />
                  <Input
                    label="Wrong"
                    type="number"
                    value={easyWrong}
                    onValueChange={setEasyWrong}
                    classNames={{
                      input: "text-white",
                      inputWrapper: "bg-gray-700/50",
                    }}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-yellow-400 mb-2">
                  Medium
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Correct"
                    type="number"
                    value={mediumCorrect}
                    onValueChange={setMediumCorrect}
                    classNames={{
                      input: "text-white",
                      inputWrapper: "bg-gray-700/50",
                    }}
                  />
                  <Input
                    label="Wrong"
                    type="number"
                    value={mediumWrong}
                    onValueChange={setMediumWrong}
                    classNames={{
                      input: "text-white",
                      inputWrapper: "bg-gray-700/50",
                    }}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-400 mb-2">Hard</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Correct"
                    type="number"
                    value={hardCorrect}
                    onValueChange={setHardCorrect}
                    classNames={{
                      input: "text-white",
                      inputWrapper: "bg-gray-700/50",
                    }}
                  />
                  <Input
                    label="Wrong"
                    type="number"
                    value={hardWrong}
                    onValueChange={setHardWrong}
                    classNames={{
                      input: "text-white",
                      inputWrapper: "bg-gray-700/50",
                    }}
                  />
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Maintenance Mode */}
        <Card className="bg-gray-800/50">
          <CardHeader>
            <h2 className="text-xl font-semibold text-white">Maintenance</h2>
          </CardHeader>
          <Divider />
          <CardBody className="space-y-4">
            <div className="flex items-center gap-4">
              <Switch
                isSelected={maintenanceMode}
                onValueChange={setMaintenanceMode}
                color="danger"
              >
                <span className="text-white">Maintenance Mode</span>
              </Switch>
              {maintenanceMode && (
                <Chip color="danger" variant="flat">
                  Site is in maintenance
                </Chip>
              )}
            </div>
            {maintenanceMode && (
              <Input
                label="Maintenance Message"
                value={maintenanceMessage}
                onValueChange={setMaintenanceMessage}
                placeholder="Optional message to display"
                classNames={{
                  input: "text-white",
                  inputWrapper: "bg-gray-700/50",
                }}
              />
            )}
          </CardBody>
        </Card>

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <Button
            color="primary"
            size="lg"
            onPress={handleSave}
            isLoading={isSaving}
          >
            Save Changes
          </Button>

          {saveSuccess && (
            <Chip color="success" variant="flat">
              Saved! Changes will take effect within 60 seconds.
            </Chip>
          )}

          {saveError && (
            <Chip color="danger" variant="flat">
              {saveError}
            </Chip>
          )}
        </div>

        {/* Last Updated */}
        {config && (
          <div className="text-sm text-gray-500">
            Last updated: {new Date(config.updatedAt).toLocaleString()}
            {config.updatedBy && ` by ${config.updatedBy}`}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Chip, Button, Tooltip } from "@nextui-org/react";

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

const DEPLOYED_COMMIT = process.env.NEXT_PUBLIC_DEPLOYED_COMMIT || "unknown";
const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME || "unknown";
const GITHUB_REPO = "vesnathan/quiz-night-live";

export function DeploymentStatus() {
  const [latestCommit, setLatestCommit] = useState<GitHubCommit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLatestCommit() {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/commits/main`,
          {
            headers: {
              Accept: "application/vnd.github.v3+json",
            },
          },
        );

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`);
        }

        const data = await response.json();
        setLatestCommit(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch");
      } finally {
        setIsLoading(false);
      }
    }

    fetchLatestCommit();
  }, []);

  const needsDeployment = latestCommit && latestCommit.sha !== DEPLOYED_COMMIT;
  const commitsBehind =
    needsDeployment && latestCommit
      ? `Latest: ${latestCommit.sha.slice(0, 7)}`
      : null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <Card
      className={`${
        needsDeployment
          ? "bg-warning-900/30 border-warning-500"
          : "bg-success-900/30 border-success-500"
      } border`}
    >
      <CardBody className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3 h-3 rounded-full ${
                needsDeployment ? "bg-warning-500" : "bg-success-500"
              } ${needsDeployment ? "animate-pulse" : ""}`}
            />
            <div>
              <h3 className="font-semibold text-white">Deployment Status</h3>
              <p className="text-sm text-gray-400">
                {isLoading
                  ? "Checking..."
                  : error
                    ? `Error: ${error}`
                    : needsDeployment
                      ? "Production needs deployment"
                      : "Production is up to date"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {needsDeployment ? (
              <Chip color="warning" variant="flat" size="sm">
                Outdated
              </Chip>
            ) : (
              <Chip color="success" variant="flat" size="sm">
                Current
              </Chip>
            )}
          </div>
        </div>

        {/* Commit details */}
        <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-gray-500 mb-1">Deployed Commit</p>
            <Tooltip content={DEPLOYED_COMMIT}>
              <code className="text-gray-300 bg-gray-800 px-2 py-1 rounded">
                {DEPLOYED_COMMIT.slice(0, 7)}
              </code>
            </Tooltip>
            <p className="text-gray-500 mt-1">
              Built: {formatDate(BUILD_TIME)}
            </p>
          </div>

          {latestCommit && (
            <div>
              <p className="text-gray-500 mb-1">Latest on Main</p>
              <Tooltip content={latestCommit.sha}>
                <code
                  className={`px-2 py-1 rounded ${
                    needsDeployment
                      ? "text-warning-300 bg-warning-900/50"
                      : "text-gray-300 bg-gray-800"
                  }`}
                >
                  {latestCommit.sha.slice(0, 7)}
                </code>
              </Tooltip>
              <p className="text-gray-500 mt-1">
                {formatDate(latestCommit.commit.author.date)}
              </p>
            </div>
          )}
        </div>

        {/* Latest commit message */}
        {latestCommit && needsDeployment && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-gray-500 text-xs mb-1">Latest commit:</p>
            <p className="text-sm text-warning-300 truncate">
              {latestCommit.commit.message.split("\n")[0]}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              by {latestCommit.commit.author.name}
            </p>
          </div>
        )}

        {/* Deploy action */}
        {needsDeployment && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <Button
              as="a"
              href={`https://github.com/${GITHUB_REPO}/actions/workflows/deploy.yml`}
              target="_blank"
              rel="noopener noreferrer"
              color="warning"
              variant="flat"
              size="sm"
              className="w-full"
            >
              Open Deploy Workflow
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

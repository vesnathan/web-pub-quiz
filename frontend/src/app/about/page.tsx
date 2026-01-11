"use client";

import { Card, CardBody } from "@nextui-org/react";
import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";

export default function AboutPage() {
  return (
    <>
      <main className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto">
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

          <h1 className="text-3xl font-bold text-white mb-8">
            About QuizNight.live
          </h1>

          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6 prose prose-invert max-w-none">
              <p className="text-gray-300 text-lg">
                QuizNight.live brings the excitement of pub trivia to your
                screen with real-time multiplayer quiz action.
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                How It Works
              </h2>
              <p className="text-gray-300">
                Quiz sets run for 30 minutes with 30-minute breaks in between.
                Jump into a room, answer questions as they appear, and race
                against the clock. Choose your difficulty level - harder
                questions reward more points but penalize less for wrong
                answers!
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Scoring
              </h2>
              <p className="text-gray-300 mb-2">Points vary by difficulty:</p>
              <ul className="text-gray-300 list-disc pl-6 space-y-2">
                <li>
                  <strong>Easy:</strong> +50 correct / -200 wrong
                </li>
                <li>
                  <strong>Medium:</strong> +75 correct / -100 wrong
                </li>
                <li>
                  <strong>Hard:</strong> +100 correct / -50 wrong
                </li>
              </ul>
              <p className="text-gray-300 mt-2 text-sm">
                Multiple wrong guesses increase the penalty!
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Compete and Climb
              </h2>
              <p className="text-gray-300">
                Track your progress on daily, weekly, and all-time leaderboards.
                Compete against players from around the world and prove
                you&apos;re the ultimate quiz champion!
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Join the Fun
              </h2>
              <p className="text-gray-300">
                Create a free account and start playing today. See you at the
                next quiz!
              </p>
            </CardBody>
          </Card>
        </div>
      </main>
      <AppFooter hideConnectionStatus />
    </>
  );
}

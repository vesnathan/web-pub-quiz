"use client";

import { Card, CardBody } from "@nextui-org/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto">
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
                Quiz sets run every hour for 30 minutes, featuring 20
                challenging questions across various categories. When you know
                the answer, hit the buzzer to claim your chance to answer. Be
                quick, but be careful - wrong answers cost you points!
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Scoring
              </h2>
              <ul className="text-gray-300 list-disc pl-6 space-y-2">
                <li>+50 points for correct answers</li>
                <li>-200 points for wrong answers</li>
                <li>First to buzz gets 2 seconds to answer</li>
              </ul>

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
      <Footer />
    </>
  );
}

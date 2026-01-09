"use client";

import { Card, CardBody } from "@nextui-org/react";
import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";

export default function PrivacyPage() {
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

          <h1 className="text-3xl font-bold text-white mb-8">Privacy Policy</h1>

          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6 prose prose-invert max-w-none">
              <p className="text-gray-300">Last updated: December 2024</p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Information We Collect
              </h2>
              <p className="text-gray-300">
                We collect information you provide directly to us, such as when
                you create an account, participate in quizzes, or contact us for
                support.
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                How We Use Your Information
              </h2>
              <p className="text-gray-300">
                We use the information we collect to provide, maintain, and
                improve our services, including to track your quiz scores and
                display them on leaderboards.
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Data Security
              </h2>
              <p className="text-gray-300">
                We take reasonable measures to help protect your personal
                information from loss, theft, misuse, and unauthorized access.
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Contact Us
              </h2>
              <p className="text-gray-300">
                If you have any questions about this Privacy Policy, please
                contact us through our contact page.
              </p>
            </CardBody>
          </Card>
        </div>
      </main>
      <AppFooter />
    </>
  );
}

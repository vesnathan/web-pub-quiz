"use client";

import { Card, CardBody } from "@nextui-org/react";
import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";

export default function TermsPage() {
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
            Terms of Service
          </h1>

          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6 prose prose-invert max-w-none">
              <p className="text-gray-300">Last updated: December 2024</p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Acceptance of Terms
              </h2>
              <p className="text-gray-300">
                By accessing and using QuizNight.live, you accept and agree to
                be bound by the terms and conditions of this agreement.
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Use of Service
              </h2>
              <p className="text-gray-300">
                You agree to use the service only for lawful purposes and in
                accordance with these Terms. You agree not to use any automated
                systems or software to extract data from the service.
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                User Accounts
              </h2>
              <p className="text-gray-300">
                You are responsible for safeguarding your account credentials
                and for any activities or actions under your account.
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Fair Play
              </h2>
              <p className="text-gray-300">
                Cheating, exploiting bugs, or any other form of unfair play is
                strictly prohibited and may result in account suspension or
                termination.
              </p>

              <h2 className="text-xl font-semibold text-white mt-6 mb-3">
                Contact Us
              </h2>
              <p className="text-gray-300">
                If you have any questions about these Terms, please contact us
                through our contact page.
              </p>
            </CardBody>
          </Card>
        </div>
      </main>
      <AppFooter hideConnectionStatus />
    </>
  );
}

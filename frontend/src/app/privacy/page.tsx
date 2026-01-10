"use client";

import { Card, CardBody } from "@nextui-org/react";
import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";

export default function PrivacyPolicyPage() {
  const lastUpdated = "January 10, 2026";

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

          <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Last updated: {lastUpdated}</p>

          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6 prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  1. Introduction
                </h2>
                <p className="text-gray-300">
                  Welcome to QuizNight.live (&ldquo;we,&rdquo;
                  &ldquo;our,&rdquo; or &ldquo;us&rdquo;). We are committed to
                  protecting your privacy and personal data. This Privacy Policy
                  explains how we collect, use, share, and protect your
                  information when you use our quiz platform.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  2. Information We Collect
                </h2>
                <h3 className="text-lg font-medium text-white mb-2">
                  Account Information
                </h3>
                <ul className="text-gray-300 list-disc pl-6 space-y-1 mb-4">
                  <li>Email address</li>
                  <li>Display name</li>
                  <li>
                    Password (securely hashed, we never store plain text
                    passwords)
                  </li>
                  <li>
                    Social login data (if you sign in with Google or Facebook)
                  </li>
                </ul>

                <h3 className="text-lg font-medium text-white mb-2">
                  Game Data
                </h3>
                <ul className="text-gray-300 list-disc pl-6 space-y-1 mb-4">
                  <li>Quiz scores and statistics</li>
                  <li>Game history and achievements</li>
                  <li>Leaderboard rankings</li>
                </ul>

                <h3 className="text-lg font-medium text-white mb-2">
                  Technical Data
                </h3>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>Usage analytics (via Google Analytics)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  3. How We Use Your Information
                </h2>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>To provide and maintain our quiz platform</li>
                  <li>To create and manage your account</li>
                  <li>To display leaderboards and game statistics</li>
                  <li>To process payments for premium subscriptions</li>
                  <li>To send important service updates</li>
                  <li>To prevent cheating and ensure fair play</li>
                  <li>To improve our services through analytics</li>
                  <li>To respond to your inquiries and support requests</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  4. Legal Basis for Processing (GDPR)
                </h2>
                <p className="text-gray-300 mb-2">
                  For users in the European Economic Area (EEA), we process your
                  data based on:
                </p>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>
                    <strong>Contract:</strong> To provide the quiz service you
                    signed up for
                  </li>
                  <li>
                    <strong>Consent:</strong> For analytics cookies and
                    marketing communications
                  </li>
                  <li>
                    <strong>Legitimate Interest:</strong> To improve our
                    services and prevent fraud
                  </li>
                  <li>
                    <strong>Legal Obligation:</strong> To comply with applicable
                    laws
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  5. Cookies and Tracking
                </h2>
                <p className="text-gray-300 mb-2">We use cookies for:</p>
                <ul className="text-gray-300 list-disc pl-6 space-y-1 mb-4">
                  <li>
                    <strong>Essential cookies:</strong> Required for the site to
                    function (authentication, session management)
                  </li>
                  <li>
                    <strong>Analytics cookies:</strong> Google Analytics to
                    understand how users interact with our site
                  </li>
                </ul>
                <p className="text-gray-300">
                  You can control cookie preferences through our cookie consent
                  banner. You may also configure your browser to reject cookies,
                  though this may affect site functionality.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  6. Data Sharing
                </h2>
                <p className="text-gray-300 mb-2">
                  We may share your data with:
                </p>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>
                    <strong>Service Providers:</strong> AWS (hosting), Stripe
                    (payments), Ably (real-time features), Sentry (error
                    tracking)
                  </li>
                  <li>
                    <strong>Analytics Partners:</strong> Google Analytics
                  </li>
                  <li>
                    <strong>Legal Requirements:</strong> When required by law or
                    to protect our rights
                  </li>
                </ul>
                <p className="text-gray-300 mt-2">
                  We do not sell your personal data to third parties.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  7. Data Retention
                </h2>
                <p className="text-gray-300">
                  We retain your account data for as long as your account is
                  active. If you delete your account, we will delete or
                  anonymize your personal data within 30 days, except where we
                  are required to retain it for legal purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  8. Your Rights (GDPR)
                </h2>
                <p className="text-gray-300 mb-2">
                  If you are in the EEA, you have the right to:
                </p>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>
                    <strong>Access:</strong> Request a copy of your personal
                    data
                  </li>
                  <li>
                    <strong>Rectification:</strong> Correct inaccurate data
                  </li>
                  <li>
                    <strong>Erasure:</strong> Request deletion of your data
                    (&ldquo;right to be forgotten&rdquo;)
                  </li>
                  <li>
                    <strong>Portability:</strong> Receive your data in a
                    structured format
                  </li>
                  <li>
                    <strong>Object:</strong> Object to processing based on
                    legitimate interest
                  </li>
                  <li>
                    <strong>Withdraw Consent:</strong> Withdraw consent for
                    cookie tracking
                  </li>
                </ul>
                <p className="text-gray-300 mt-2">
                  To exercise these rights, contact us at{" "}
                  <a
                    href="mailto:privacy@quiznight.live"
                    className="text-primary-400 hover:underline"
                  >
                    privacy@quiznight.live
                  </a>{" "}
                  or use the account deletion feature in your profile settings.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  9. Data Security
                </h2>
                <p className="text-gray-300">
                  We implement industry-standard security measures including:
                </p>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>HTTPS encryption for all data in transit</li>
                  <li>Encrypted data storage</li>
                  <li>Secure authentication via AWS Cognito</li>
                  <li>Regular security audits</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  10. International Transfers
                </h2>
                <p className="text-gray-300">
                  Your data is primarily stored in AWS data centers in Australia
                  (ap-southeast-2). For users outside Australia, your data may
                  be transferred internationally. We ensure appropriate
                  safeguards are in place for such transfers in compliance with
                  GDPR.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  11. Children&apos;s Privacy
                </h2>
                <p className="text-gray-300">
                  QuizNight.live is not intended for users under 13 years of
                  age. We do not knowingly collect data from children. If you
                  believe a child has provided us with personal data, please
                  contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  12. Changes to This Policy
                </h2>
                <p className="text-gray-300">
                  We may update this Privacy Policy from time to time. We will
                  notify you of significant changes by posting a notice on our
                  website or sending you an email.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  13. Contact Us
                </h2>
                <p className="text-gray-300">
                  If you have questions about this Privacy Policy or your
                  personal data, please contact us:
                </p>
                <ul className="text-gray-300 list-none pl-0 mt-2 space-y-1">
                  <li>
                    Email:{" "}
                    <a
                      href="mailto:privacy@quiznight.live"
                      className="text-primary-400 hover:underline"
                    >
                      privacy@quiznight.live
                    </a>
                  </li>
                  <li>
                    Contact Form:{" "}
                    <Link
                      href="/contact"
                      className="text-primary-400 hover:underline"
                    >
                      quiznight.live/contact
                    </Link>
                  </li>
                </ul>
              </section>
            </CardBody>
          </Card>
        </div>
      </main>
      <AppFooter hideConnectionStatus />
    </>
  );
}

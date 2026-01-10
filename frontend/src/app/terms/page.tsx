"use client";

import { Card, CardBody } from "@nextui-org/react";
import Link from "next/link";
import { AppFooter } from "@/components/AppFooter";

export default function TermsOfServicePage() {
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

          <h1 className="text-3xl font-bold text-white mb-2">
            Terms of Service
          </h1>
          <p className="text-gray-400 mb-8">Last updated: {lastUpdated}</p>

          <Card className="bg-gray-800/50 backdrop-blur">
            <CardBody className="p-6 prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  1. Acceptance of Terms
                </h2>
                <p className="text-gray-300">
                  By accessing or using QuizNight.live (&ldquo;the
                  Service&rdquo;), you agree to be bound by these Terms of
                  Service. If you do not agree to these terms, please do not use
                  the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  2. Description of Service
                </h2>
                <p className="text-gray-300">
                  QuizNight.live is a real-time multiplayer quiz platform that
                  allows users to compete in trivia games. We offer both free
                  and premium subscription tiers with different features and
                  benefits.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  3. Account Registration
                </h2>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>You must be at least 13 years old to use this Service</li>
                  <li>
                    You must provide accurate and complete registration
                    information
                  </li>
                  <li>
                    You are responsible for maintaining the security of your
                    account
                  </li>
                  <li>
                    You are responsible for all activities that occur under your
                    account
                  </li>
                  <li>One person may not maintain more than one account</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  4. Fair Play Policy
                </h2>
                <p className="text-gray-300 mb-2">
                  To ensure a fair and enjoyable experience for all players, you
                  agree NOT to:
                </p>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>Use bots, scripts, or automated tools to play</li>
                  <li>Exploit bugs or glitches in the game</li>
                  <li>Share answers with other players during live games</li>
                  <li>
                    Use external assistance (search engines, AI) during timed
                    questions
                  </li>
                  <li>Create multiple accounts to manipulate leaderboards</li>
                  <li>Collude with other players to gain unfair advantages</li>
                </ul>
                <p className="text-gray-300 mt-2">
                  Violations may result in score resets, temporary suspension,
                  or permanent account termination.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  5. User Conduct
                </h2>
                <p className="text-gray-300 mb-2">You agree not to:</p>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>
                    Use offensive, inappropriate, or misleading display names
                  </li>
                  <li>Harass, abuse, or threaten other users</li>
                  <li>Post spam, advertisements, or promotional content</li>
                  <li>Impersonate other users or staff members</li>
                  <li>
                    Attempt to access other users&apos; accounts or private
                    information
                  </li>
                  <li>Interfere with or disrupt the Service or servers</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  6. Premium Subscriptions
                </h2>
                <p className="text-gray-300 mb-2">
                  Premium subscriptions are available for enhanced features:
                </p>
                <ul className="text-gray-300 list-disc pl-6 space-y-1">
                  <li>
                    Subscriptions are billed monthly or annually as selected at
                    purchase
                  </li>
                  <li>
                    Subscriptions automatically renew unless cancelled before
                    the renewal date
                  </li>
                  <li>
                    You can cancel your subscription at any time through your
                    account settings or payment provider
                  </li>
                  <li>
                    Refunds are handled according to our refund policy and
                    applicable consumer protection laws
                  </li>
                  <li>
                    We reserve the right to modify subscription pricing with 30
                    days notice
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  7. Intellectual Property
                </h2>
                <p className="text-gray-300">
                  The Service, including its content, features, and
                  functionality, is owned by QuizNight.live and protected by
                  copyright, trademark, and other intellectual property laws.
                  You may not copy, modify, distribute, or create derivative
                  works without our written permission.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  8. User Content
                </h2>
                <p className="text-gray-300">
                  By using our Service, you grant us a non-exclusive,
                  royalty-free license to use, display, and distribute any
                  content you submit (such as display names and chat messages)
                  as necessary to operate the Service. You retain ownership of
                  your content.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  9. Termination
                </h2>
                <p className="text-gray-300">
                  We may suspend or terminate your account at any time for
                  violations of these Terms or for any other reason at our
                  discretion. You may delete your account at any time through
                  your profile settings. Upon termination, your right to use the
                  Service will immediately cease.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  10. Disclaimers
                </h2>
                <p className="text-gray-300">
                  THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; WITHOUT WARRANTIES
                  OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE THAT THE
                  SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR SECURE. WE ARE
                  NOT RESPONSIBLE FOR ANY LOSS OF DATA, SCORES, OR PROGRESS DUE
                  TO TECHNICAL ISSUES.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  11. Limitation of Liability
                </h2>
                <p className="text-gray-300">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, QUIZNIGHT.LIVE SHALL
                  NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                  CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF
                  THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT
                  YOU PAID US IN THE PAST 12 MONTHS.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  12. Indemnification
                </h2>
                <p className="text-gray-300">
                  You agree to indemnify and hold harmless QuizNight.live and
                  its operators from any claims, damages, or expenses arising
                  from your use of the Service or violation of these Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  13. Governing Law
                </h2>
                <p className="text-gray-300">
                  These Terms shall be governed by the laws of Australia. Any
                  disputes shall be resolved in the courts of New South Wales,
                  Australia.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  14. Changes to Terms
                </h2>
                <p className="text-gray-300">
                  We reserve the right to modify these Terms at any time. We
                  will notify users of significant changes by posting a notice
                  on our website. Continued use of the Service after changes
                  constitutes acceptance of the modified Terms.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">
                  15. Contact Us
                </h2>
                <p className="text-gray-300">
                  If you have questions about these Terms of Service, please
                  contact us:
                </p>
                <ul className="text-gray-300 list-none pl-0 mt-2 space-y-1">
                  <li>
                    Email:{" "}
                    <a
                      href="mailto:support@quiznight.live"
                      className="text-primary-400 hover:underline"
                    >
                      support@quiznight.live
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

"use client";

import { Card, CardBody } from "@nextui-org/react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto">
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
      <Footer />
    </>
  );
}

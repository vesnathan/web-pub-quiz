"use client";

import Link from "next/link";
import { NotificationButton } from "./NotificationButton";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900/80 border-t border-gray-800 mt-auto">
      <div className="max-w-6xl mx-auto px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-400 text-sm">
            &copy; {currentYear} QuizNight.live. All rights reserved.
          </div>
          <nav className="flex items-center gap-6">
            <NotificationButton />
            <Link
              href="/privacy"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/about"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Contact
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

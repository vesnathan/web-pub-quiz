import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import { Providers } from "@/app/providers";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { CookieConsentBanner } from "@/components/CookieConsent";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#00001B",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://quiznight.live"),
  title: "QuizNight.live - Real-time Multiplayer Trivia",
  description:
    "Real-time multiplayer trivia with buzzer mechanics. Join live quiz sessions, compete with players worldwide, and climb the leaderboards!",
  keywords: [
    "quiz",
    "trivia",
    "multiplayer",
    "live",
    "buzzer",
    "pub quiz",
    "game",
  ],
  authors: [{ name: "QuizNight.live" }],
  icons: {
    icon: [
      { url: "/logo-small.png", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "QuizNight.live - Real-time Multiplayer Trivia",
    description:
      "Play live trivia battles with players from around the world. Join now and test your knowledge!",
    url: "https://quiznight.live",
    siteName: "QuizNight.live",
    images: [
      {
        url: "https://quiznight.live/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "QuizNight.live - Play Now",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QuizNight.live - Real-time Multiplayer Trivia",
    description:
      "Play live trivia battles with players from around the world. Join now and test your knowledge!",
    images: ["https://quiznight.live/og-image.png?v=2"],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-foreground`}>
        <GoogleAnalytics />
        <Providers>{children}</Providers>
        <CookieConsentBanner />
      </body>
    </html>
  );
}

"use client";

interface AdBannerProps {
  /** If true, the ad is hidden (for ad-free subscribers) */
  isAdFree?: boolean;
}

export function AdBanner({ isAdFree }: AdBannerProps) {
  if (isAdFree) return null;

  return (
    <a
      href="https://app-builder-studio.com"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full"
    >
      <img
        src="https://app-builder-studio.com/assets/banner.png"
        alt="App Builder Studio - Custom Apps Built to Launch & Scale"
        className="w-full rounded-lg shadow-sm hover:shadow-md transition-shadow"
      />
    </a>
  );
}

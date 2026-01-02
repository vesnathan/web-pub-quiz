import { Suspense } from "react";
import GamePageContent from "./GamePageContent";
import { LoadingScreen } from "@/components/LoadingScreen";

/**
 * Game page wrapper with Suspense boundary
 *
 * This page wraps GamePageContent in a Suspense boundary because
 * it uses useSearchParams, which requires Suspense in Next.js.
 */
export default function GamePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <GamePageContent />
    </Suspense>
  );
}

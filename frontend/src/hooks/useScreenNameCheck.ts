import { useState, useEffect, useRef, useCallback } from "react";
import { checkDisplayNameAvailable } from "@/lib/api";

export type ScreenNameStatus = "idle" | "checking" | "available" | "taken";

interface UseScreenNameCheckReturn {
  status: ScreenNameStatus;
  checkName: (name: string, immediate?: boolean) => void;
  reset: () => void;
}

const MIN_NAME_LENGTH = 3;
const DEBOUNCE_MS = 500;

export function useScreenNameCheck(): UseScreenNameCheckReturn {
  const [status, setStatus] = useState<ScreenNameStatus>("idle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedRef = useRef<string>("");
  const statusRef = useRef<ScreenNameStatus>("idle");

  // Keep statusRef in sync with status
  statusRef.current = status;

  const checkAvailability = useCallback(async (name: string) => {
    if (name.length < MIN_NAME_LENGTH) {
      setStatus("idle");
      return;
    }

    // Skip if we already checked this exact name and have a result
    if (
      lastCheckedRef.current === name &&
      statusRef.current !== "idle" &&
      statusRef.current !== "checking"
    ) {
      return;
    }

    setStatus("checking");
    lastCheckedRef.current = name;

    try {
      const isAvailable = await checkDisplayNameAvailable(name);

      // Only update if this is still the name we're checking
      if (lastCheckedRef.current === name) {
        setStatus(isAvailable ? "available" : "taken");
      }
    } catch (error) {
      console.error("Error checking screen name:", error);
      if (lastCheckedRef.current === name) {
        setStatus("idle");
      }
    }
  }, []);

  const checkName = useCallback(
    (name: string, immediate = false) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (name.length >= MIN_NAME_LENGTH) {
        if (immediate) {
          // Immediate check (e.g., on blur) - no debounce
          checkAvailability(name);
        } else {
          // Debounced check (e.g., while typing)
          debounceRef.current = setTimeout(() => {
            checkAvailability(name);
          }, DEBOUNCE_MS);
        }
      } else {
        setStatus("idle");
        lastCheckedRef.current = "";
      }
    },
    [checkAvailability],
  );

  const reset = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setStatus("idle");
    lastCheckedRef.current = "";
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { status, checkName, reset };
}

"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ backgroundColor: "#111827", color: "#fff" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{ maxWidth: "400px", textAlign: "center" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>😕</div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              Something went wrong
            </h1>
            <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
              We've been notified and are looking into it.
            </p>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: "#3b82f6",
                color: "#fff",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
                marginRight: "0.5rem",
              }}
            >
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                backgroundColor: "#374151",
                color: "#fff",
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
            {error.digest && (
              <p
                style={{
                  marginTop: "1.5rem",
                  fontSize: "0.75rem",
                  color: "#6b7280",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}

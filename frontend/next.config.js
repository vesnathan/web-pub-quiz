const { execSync } = require("child_process");
const { withSentryConfig } = require("@sentry/nextjs");

// Get the current git commit hash at build time
function getGitCommitHash() {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@quiz/shared"],
  output: "export",
  env: {
    // Embed commit hash at build time for deployment status check
    NEXT_PUBLIC_DEPLOYED_COMMIT: getGitCommitHash(),
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
};

module.exports = withSentryConfig(nextConfig, {
  // Sentry options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only upload source maps in CI
  silent: !process.env.CI,

  // Upload source maps for better stack traces
  widenClientFileUpload: true,

  // Hide source maps from users
  hideSourceMaps: true,

  // Disable telemetry
  telemetry: false,

  // Disable automatic instrumentation for static export
  disableServerWebpackPlugin: true,
  disableClientWebpackPlugin: false,
});

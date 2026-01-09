const { execSync } = require("child_process");

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

module.exports = nextConfig;

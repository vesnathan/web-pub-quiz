/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@quiz/shared"],
  output: "export",
};

module.exports = nextConfig;

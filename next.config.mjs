/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The SDK is ESM and shipped prebuilt; let Next transpile it for server routes.
  transpilePackages: ["@contentstack/agents-sdk"],
};

export default nextConfig;

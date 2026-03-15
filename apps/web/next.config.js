/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@aura/shared"],
};

module.exports = nextConfig;

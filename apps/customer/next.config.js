/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@blitzpay/ui", "@blitzpay/shared", "@blitzpay/blockchain"],
};

module.exports = nextConfig;

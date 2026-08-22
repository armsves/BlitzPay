const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@blitzpay/ui", "@blitzpay/shared", "@blitzpay/blockchain"],
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

module.exports = nextConfig;

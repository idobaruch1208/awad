import type { NextConfig } from "next";

// In development with corporate SSL inspection (e.g. Zscaler), Node.js cannot
// verify the intercepted certificate. This tells Node.js to skip SSL verification
// for all server-side fetch calls — dev only, never set this in production.
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    turbopackUseSystemTlsCerts: true,
  },
};

export default nextConfig;

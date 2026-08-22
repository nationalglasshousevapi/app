/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // Tree-shake barrel imports so only used code ships to the browser —
    // important for low-end devices (older Chromebooks).
    optimizePackageImports: ["framer-motion", "recharts", "date-fns", "@react-pdf/renderer"],
  },
};

export default nextConfig;

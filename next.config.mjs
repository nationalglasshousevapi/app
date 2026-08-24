/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    // @react-pdf/renderer must stay external in server bundles — webpack's
    // RSC React shims break its reconciler ("Component is not a constructor").
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // Tree-shake barrel imports so only used code ships to the browser —
    // important for low-end devices (older Chromebooks).
    optimizePackageImports: ["framer-motion", "recharts", "date-fns"],
  },
};

export default nextConfig;

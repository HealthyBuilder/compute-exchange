import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produce a compact Node runtime bundle for the private EC2 demo service.
  output: "standalone",
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Ensure pdfjs worker can be resolved in Node runtime
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "canvas": false,
    };
    return config;
  },
};

export default nextConfig;

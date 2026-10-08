import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  productionBrowserSourceMaps: false,
  typescript: { ignoreBuildErrors: false },
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ["localhost", "127.0.0.1"],
  webpack: (config) => {
    // Allow importing .glb, .gltf, .ogg, .mp3 files
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      type: "asset/resource",
    });
    config.module.rules.push({
      test: /\.(ogg|mp3|wav)$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;

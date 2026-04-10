import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Midnight SDK packages may import Node built-ins in browser bundles.
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        assert: require.resolve("assert"),
        buffer: require.resolve("buffer"),
        crypto: require.resolve("crypto-browserify"),
        fs: false,
        net: false,
        process: require.resolve("process/browser"),
        stream: require.resolve("stream-browserify"),
        tls: false,
        util: require.resolve("util/"),
      };

      config.plugins = config.plugins || [];
      const webpack = require("webpack") as {
        ProvidePlugin: new (definitions: Record<string, unknown>) => unknown;
      };
      config.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: ["process"],
        }),
      );
    }

    return config;
  },
};

export default nextConfig;

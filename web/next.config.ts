import path from "node:path";
import { loadEnvConfig, updateInitialEnv } from "@next/env";
import type { NextConfig } from "next";

// One .env for the whole project: the Python ingestion script and this app share the
// project-root .env (Supabase URL/keys, Gemini key).
//
// Why updateInitialEnv: Next.js snapshots process.env at startup and restores that snapshot
// each time it (re)loads web/.env* files, which would wipe variables we load here. Adding the
// root values to the snapshot makes them survive those resets. Values in web/.env* still win.
const { parsedEnv } = loadEnvConfig(path.resolve(process.cwd(), ".."), true, { info() {}, error: console.error }, true);
if (parsedEnv) updateInitialEnv(parsedEnv);

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Note: @huggingface/transformers and onnxruntime-node are on Next.js's built-in
  // serverExternalPackages list, so they run with native Node require (no bundling).
};

export default nextConfig;

import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
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
  // Workspace packages are TypeScript source (step 0.2.12).
  transpilePackages: ["@jathag/api", "@jathag/engine", "@jathag/places"],
  // Native Swiss Ephemeris binding: loaded by Node at run time, never bundled (D-069).
  serverExternalPackages: ["sweph"],
  // Trace files from the monorepo root, and copy each endpoint's data files into ITS function only:
  // the 21 MB place index goes to the place function (search + nearest), the 1.7 MB ephemeris files to the chart and range functions.
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  outputFileTracingIncludes: {
    "/api/chart": [
      "../../packages/engine/ephe/*.se1",
      // sweph finds its compiled binary at run time, so the tracer cannot see it (Vercel: Linux).
      "../../node_modules/.pnpm/sweph@*/node_modules/sweph/prebuilds/linux-*/sweph.node",
    ],
    // The range scan (step 0.3.6) is its own function and needs the same files as the chart.
    "/api/chart/range": [
      "../../packages/engine/ephe/*.se1",
      "../../node_modules/.pnpm/sweph@*/node_modules/sweph/prebuilds/linux-*/sweph.node",
    ],
    // Place search and nearest place (step 0.5.2): one route, /api/places/[action], one function.
    "/api/places/*": ["../../data/places/index/places.tsv.gz"],
  },
};

export default nextConfig;

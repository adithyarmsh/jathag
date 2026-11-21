// Build-time loader (step 0.2.12): lets Turbopack bundle packages/engine without changing the engine.
//
// packages/engine/src/ephemeris/sweph.ts finds its data folder with
//   new URL('../../ephe/', import.meta.url)
// Turbopack treats `new URL(…, import.meta.url)` as a file to bundle and fails because the target is
// a folder. In the web app the folder is never found that way anyway (the code is bundled elsewhere):
// the chart route passes the real path (apps/web/lib/server/paths.ts). So, in the bundle only, the
// line is pointed at a placeholder path. If someone calls the adapter without a path in the web app,
// Swiss Ephemeris finds no files and the engine throws EPHEMERIS_FALLBACK (never a silent wrong answer).
//
// If the engine line changes, this loader stops the build instead of guessing.
const FROM = "new URL('../../ephe/', import.meta.url)";
const TO = "new URL('file:///jathag-engine-ephe-path-is-passed-by-the-web-app/')";

module.exports = function engineEphePathLoader(source) {
  if (!source.includes(FROM)) {
    throw new Error(`engine-ephe-path-loader: "${FROM}" not found in ${this.resourcePath}; update apps/web/bundler/engine-ephe-path-loader.cjs`);
  }
  return source.replace(FROM, TO);
};

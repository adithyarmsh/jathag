// Server-only: where the data files are at run time, locally and on Vercel.
//
// The engine and the place index read files from the monorepo (packages/engine/ephe/,
// data/places/index/). Next.js bundles the code, so the engine's own "next to this file" path
// does not point at the real folder any more; we pass the path explicitly instead. Both folders are
// copied into the matching function by `outputFileTracingIncludes` in next.config.ts. Next.js runs
// with the app folder (apps/web) as the working directory, locally and on Vercel.
import { existsSync } from 'node:fs';
import path from 'node:path';

function repoFile(relative: string): string {
  const candidates = [
    path.join(/* turbopackIgnore: true */ process.cwd(), '..', '..', relative), // apps/web → repo root
    path.join(/* turbopackIgnore: true */ process.cwd(), relative), // started from the repo root
  ];
  return candidates.find((p) => existsSync(p)) ?? candidates[0]!;
}

/** Swiss Ephemeris data folder (sepl_18.se1, semo_18.se1). */
export const ephemerisPath = () => repoFile('packages/engine/ephe') + path.sep;

/** The GeoNames place index (data/places, step 0.2.11). */
export const placeIndexFile = () => repoFile('data/places/index/places.tsv.gz');

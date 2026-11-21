/** Loading the place index file in Node (server side only). */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { PlaceIndex } from './index.ts';

/** Reads a places.tsv.gz (or a plain places.tsv) file and builds the search index. */
export function loadPlaceIndex(path: string): PlaceIndex {
  const buf = readFileSync(path);
  const text = path.endsWith('.gz') ? gunzipSync(buf).toString('utf8') : buf.toString('utf8');
  return new PlaceIndex(text);
}

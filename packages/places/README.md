# @jathag/places

Birth-place search over the GeoNames place index (`data/places`, step 0.2.11). Search only: no UI, no interpretation text, and no logging or storing of queries (a birthplace is birth data, FR-API-02).

```ts
import { loadPlaceIndex } from '@jathag/places/node';

const places = loadPlaceIndex('data/places/index/places.tsv.gz'); // load once per server instance
places.search('Bombay')[0];
// { id: 1275339, name: 'Mumbai', label: 'Mumbai, Maharashtra, India', matchedName: 'Bombay',
//   lat: 19.07283, lng: 72.88261, timeZone: 'Asia/Kolkata', admin1Code: '16', admin2Code: '', … }
places.search('Aurangabad, Bihar');  // text after a comma narrows by district, state or country
places.get(1278149);                 // by GeoNames id
```

- Type-ahead: case- and accent-insensitive prefix match on the name, the ASCII name and selected old or alternate names; at least 2 characters; top 10 results by default.
- Ranking: exact matches first, then bigger population (an alternate-name match counts as 10× smaller), then settlement type, then GeoNames id.
- Label: "Place, District, State, Country". Parts that GeoNames lacks are left out.
- `excludeFeatureCodes` can leave out, for example, abandoned places (`PPLQ`). By default nothing is left out.

Tests: `packages/places/test/`. Loading time on Vercel is a known issue (≈ 5–9 s cold start); see `notes/0.2.11-place-index-feasibility.md`.

# @jathag/places

Birth-place search over the GeoNames place index (`data/places`, step 0.2.11, D-087). Search only: no UI, no interpretation text, and no logging or storing of queries (a birthplace is birth data, FR-API-02).

```ts
import { loadPlaceIndex } from '@jathag/places/node';
import { isWestBengal } from '@jathag/places';

const places = loadPlaceIndex('data/places/index/places.tsv.gz'); // once per server instance (≈ 0.8 s on Vercel)
places.search('Bombay')[0];
// { id: 1275339, name: 'Mumbai', label: 'Mumbai, Maharashtra, India', matchedName: 'Bombay',
//   lat: 19.07283, lng: 72.88261, timeZone: 'Asia/Kolkata', admin1Code: '16', admin2Code: '', … }
places.search('Aurangabad, Bihar');  // text after a comma narrows by district, state or country
places.get(1278149);                 // by GeoNames id
places.corrections;                  // GeoNames values corrected by the build (corrections.json)

// For the "Which clock?" rule (D-082, D-086, D-087), used from 0.2.12:
places.isMumbai(place);   // district Mumbai City / Mumbai Suburban, or on the Mumbai list
isWestBengal(place);      // state IN.28
```

- **Type-ahead:** case- and accent-insensitive prefix match. Starts at **3 characters**; top 10 by default. Places in India match on their name, plain spelling and selected old or alternate names; places elsewhere on their name and plain spelling only (D-088).
- **Order (D-088):** places in India first, then the rest of the world; within each, population, largest first. Ties: cities, seats and city neighbourhoods (every place in Mumbai counts as one) before villages, villages before abandoned or historical places; then exact match before prefix; then alphabetical by label; then GeoNames id.
- **Label:** "Place, District, State, Country" in plain ASCII, repeats collapsed ("Kolkata, Kolkata" → one), the words "District" and "Division" dropped. Parts GeoNames lacks are left out.
- `excludeFeatureCodes` can leave out place types. By default nothing is left out (D-087 keeps them all).

Tests: `packages/places/test/`. Measurements: `notes/0.2.11-place-index-feasibility.md`.

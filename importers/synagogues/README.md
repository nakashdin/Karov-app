# Synagogues importer

Imports synagogues (בתי כנסת) for **all of Israel** from **OpenStreetMap** via
the Overpass API, into a **local JSON file for inspection**.

| | |
|---|---|
| **Source** | OpenStreetMap / Overpass API |
| **Selector** | `amenity=place_of_worship` + `religion=jewish` |
| **License** | ODbL 1.0 (keep OpenStreetMap attribution in the app) |
| **Output** | `importers/synagogues/output/synagogues.json` |

It does **not** modify any app screen, does **not** overwrite existing data, and
does **not** connect to Supabase. Missing fields are never invented.

## Run

```bash
npm run import:synagogues
# or
node importers/synagogues/importer.ts
```

On finish it prints a summary: how many were fetched, valid, rejected (with
reasons), and how many duplicates.

## Output record shape

The output type is **`SynagoguePlace`**, defined in
[`importers/shared/types.ts`](../shared/types.ts) — **not** in the app's `Place`
type. The fields `sourceId`, `verifiedAt` and `isActive` exist only in the
importer layer; the app's `Place` (`src/types/place.ts`) is left untouched.

Each item in `output/synagogues.json`:

```jsonc
{
  "type": "synagogue",
  "source": "openstreetmap",
  "sourceId": "node/123456",   // canonical OSM reference
  "name": "בית הכנסת הגדול",    // required
  "lat": 32.0853,              // required, inside Israel
  "lng": 34.7818,              // required, inside Israel
  "city": "תל אביב-יפו",        // when derivable (nearest OSM locality)
  "address": "רחוב הרצל 10, תל אביב-יפו", // only when OSM has a street
  "phone": "03-1234567",       // only when present
  "verifiedAt": "2026-06-17",  // import/run date
  "isActive": true
}
```

`city`, `address` and `phone` are omitted when the source doesn't provide them.

## Validation rules

A record is kept only if **all** hold; otherwise it's counted as rejected:

- `name` is present
- `lat` and `lng` are present
- coordinates fall inside Israel's bounding box
- `sourceId` is unique (repeats counted as duplicates)

## Notes / caveats

- OSM rarely tags **phone** and **opening hours** for synagogues — expect those
  to be sparse or empty. This importer omits them rather than guessing.
- Data is volunteer-maintained: a place may be outdated or already closed. There
  is no freshness guarantee.

# Mikvahs importer

Imports ritual baths (מקוואות טהרה) from the **official data.gov.il dataset**.
Built in controlled steps; this folder currently implements **step 2** (fetch +
normalize to local files, **no coordinates yet**).

| | |
|---|---|
| **Source** | data.gov.il — resource `e80a5e59-3b0f-4be9-983a-dc0971907626` |
| **Coverage** | 606 records, 354 cities, near-100% field fill (phone/hours/address) |
| **License** | Open (data.gov.il) |
| **Coordinates** | ❌ none in source → added later via geocoding (step 3) |
| **Status** | step 2 done — not geocoded, not wired into the app |

## Controlled pipeline

1. **Inspection** — verify the source (done).
2. **Importer → local output** ← *you are here*. Fetch, clean text, normalize.
3. **Geocoding + cache** — address → lat/lng (`geocoder.ts`).
4. **App-ready output** — map to the app's `Place`.
5. **Mapper to Place**.
6. **Preview merge** — merge with the live dataset (preview only).
7. **App wiring** — requires adding `'mikveh'` to `PlaceType` + UI (separate, approved step).

## Files

- `importer.ts` — step 2: paginate the datastore → clean → normalize → write.
- `transform.ts` — gov record → `MikvahRaw` (cleaned) → `MikvahPlace` (no lat/lng).
- `validate.ts` — step-2 rules: name required + unique id (no location checks yet).
- `geocoder.ts` — prepared for step 3 (address → lat/lng via Nominatim, cached). Not used in step 2.

## Run (step 2)

```bash
node importers/mikvahs/importer.ts
```

Writes two local files for inspection:

- `output/mikvahs.raw.json` — cleaned `MikvahRaw[]` (mirrors the source fields).
- `output/mikvahs.normalized.json` — valid `MikvahPlace[]` (internal shape, no coordinates).

Prints a summary: fetched, valid, rejected, duplicates, how many lack an
address, unique cities, and per-field fill rates.

## Notes / caveats

- **No coordinates and no guessing in step 2.** `lat`/`lng` are intentionally
  absent until geocoding (step 3).
- Text cleaning is whitespace-only; source typos are left untouched.
- Importer-only fields (`sourceId`, `verifiedAt`, `isActive`, `extra`) are not
  part of the app's `Place` type.

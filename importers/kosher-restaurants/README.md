# Kosher-restaurants importer

Imports kosher-serving restaurants/businesses for **all of Israel** from
**OpenStreetMap** via Overpass.

| | |
|---|---|
| **Source** | OpenStreetMap / Overpass API |
| **Selector** | `diet:kosher` ∈ {yes, only, designated} + `amenity` |
| **Coverage** | Weak — ~346 records (OSM kosher tagging is sparse) |
| **License** | ODbL 1.0 (attribution + share-alike) |
| **Coordinates** | Yes (native lat/lng) |
| **Status** | ✅ in use, but ⚠️ **open coverage gap** |

## Files

- `importer.ts` — fetch localities + kosher places → transform → validate → write.
- `transform.ts` — OSM element → `NormalizedPlace` (cuisine → `tags`, raw `diet:kosher` → `extra.osmKosher`).
- `validate.ts` — drops records with no name, no/foreign coordinates, or duplicate id.

## Run

```bash
npm run import:restaurants
# or
node importers/kosher-restaurants/importer.ts
```

Writes `src/data/generated/restaurants.osm.json`, then rebuilds the combined app
dataset.

## ⚠️ The open gap

OSM is the only *free + legal* source today, but it barely tags kosher
businesses, and it carries **no real kosher certification** (type / מהדרין /
supervising authority). We deliberately do **not** invent that data —
`extra.osmKosher` is only the raw OSM signal, not a certification claim.

The proper fix is an authoritative feed (e.g. the Ministry of Religious
Services / a community partnership). Tracked in `STATUS.md` → "open / next".
When such a source lands, add it as a sibling source here mapping onto the same
`NormalizedPlace` shape — the app side won't need to change.

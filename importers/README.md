# Importers

The data pipeline that turns real, free, legal public sources into the dataset
the app reads. One folder per category; each folder follows the same shape:

```
importers/
├── synagogues/          OSM — ✅ in use
├── mikvahs/             data.gov.il + geocoding — 🔜 next
├── kosher-restaurants/  OSM — ✅ in use (⚠️ open coverage gap)
└── shared/              types, utils, the write/merge "database" layer
```

Per category:

| file | role |
|---|---|
| `importer.ts` | orchestration — fetch → transform → validate → write |
| `transform.ts` | one raw source record → one `NormalizedPlace` |
| `validate.ts` | reject bad records (no name, bad coords, duplicates) |
| `geocoder.ts` | (mikvahs only) address → lat/lng via Nominatim |
| `README.md` | source, license, coverage, caveats |

`shared/` holds `types.ts` (the common `NormalizedPlace` schema), `utils.ts`
(HTTP, geo math, OSM parsing, stats) and `database.ts` (writes per-category
files and merges the app-supported ones into `places.osm.json` /
`cities.osm.json`).

## Run

Node 23+ runs the TypeScript directly — no build step.

```bash
npm run import:synagogues     # OSM synagogues → app dataset
npm run import:restaurants    # OSM kosher restaurants → app dataset
npm run import:mikvahs        # data.gov.il mikvahs (not merged yet — see its README)
```

There is no `import:all`. It used to chain synagogues + restaurants and then
call the legacy `rebuildAppDataset()`, which reconstructed `places.osm.json`
from six per-type category files and silently deleted every record written by
any other importer — measured at 60.8% of the dataset (`docs/DATA_ARCHITECTURE.md`
B2). The command was removed rather than fixed in place, per that document's
Phase 0 recommendation. `rebuildAppDataset()` still exists (`importers/shared/database.ts`)
but now refuses to write by default; `npm run data:rebuild-plan` gives a
read-only report of what it would do.

Outputs land in `src/data/generated/`. The OSM importers each rebuild the
combined `places.osm.json` + `cities.osm.json` that the app's repository reads.

## Principles

- **Only real, free, legal data.** OSM is ODbL (attribution kept in-app);
  data.gov.il is open. We never invent kosher certification.
- **One normalized shape.** Every source maps onto `shared/types.ts`
  `NormalizedPlace`; adding a new source never touches the app.
- **Idempotent.** Re-running overwrites cleanly; geocoding is cached.

## Adding a new source

1. Create `importers/<category>/` with `importer.ts` + `transform.ts` +
   `validate.ts` + `README.md`.
2. Map the source onto `NormalizedPlace` in `transform.ts`.
3. Register its output file in `shared/database.ts` (`CATEGORY_FILES`), and add
   the type to `APP_TYPES` when the app supports it.
4. Add an `import:<category>` script to `package.json`.

> Supersedes the old one-off `scripts/fetch-osm-places.mjs` and the research
> PoC in `research/importer-poc.mjs`.

# Chabad-house importer (בתי חב״ד) — legal fallback

Builds a `chabad_house` dataset from **openly-licensed sources only**. There is
no open dataset of the ~941 physical Chabad houses; the one near-complete source
(chabad.org Locator) is legally gated (ToS forbids bulk extraction). So this
pipeline accepts **partial coverage by design** and is the legal fallback while a
formal data request to צעירי אגודת חב״ד (the operator, amuta #580021673) is the
real path to ≥90%.

## Sources

| Source | License | Coords | Addresses | Notes |
|---|---|---|---|---|
| OpenStreetMap (Overpass) | ODbL | ✅ native | partial | ~47 Chabad-tagged elements |
| data.gov.il amutot registry | gov-open* | ❌ → GovMap | ✅ textual | resource `be5b7935-…`; legal entities, not每 house |
| Wikidata | CC0 | partial | ❌ | very sparse |

\* The specific `אחר (פתוח)` license tag was not confirmed; verify exact terms
before commercial use. Reuse rests on data.gov.il's general open-data status.

## Pipeline (run order)

1. `build-preview.ts` — **DRY-RUN**. Fetch all sources → cross-source cluster →
   GovMap address geocode for coordless → dedup vs live (`synagogue` +
   `chabad_house`) → reports only. Writes nothing to live data.
   ```
   node importers/chabad/build-preview.ts
   ```
   Output: `output/reports/{preview,summary,write-ready}.json`.

2. `connect-live.ts` — **REAL MERGE**, gated, additive-only, with backup +
   validation gate. Run ONLY after the dry-run is reviewed/approved.
   ```
   node importers/chabad/connect-live.ts
   ```

## Hard rules (from the project's golden rules)

- Additive-only; **0 deletions** (enforced by the validation gate).
- Existing fields are never overwritten; existing synagogues are never touched.
- A Chabad record that is clearly the same place as a synagogue is **HELD** for
  manual review — never merged into the synagogue.
- Fresh backup before any write (`places.osm.pre-chabad.backup.json`).
- **Never** call `rebuildAppDataset` / never regenerate `places.osm.json`.

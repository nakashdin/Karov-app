# Unified importer

A **source-agnostic** import architecture: one pipeline that any source can feed
through, instead of a hand-written importer per category. It is deliberately
separate from:

- the **legacy per-category importers** (`synagogues/`, `mikvahs/`, …) — still in
  use; this does not replace them yet, and
- the **research-only council discovery** (`religious-councils/output/council-domain-catalog.json`,
  `council-domain-summary.json`, `manual-review.json`) — those are an input this
  can later *consume*, never something it modifies.

> **Status: scaffolding.** No adapter is registered, nothing fetches live data,
> and nothing is inserted into production `places`. These are schemas, interfaces
> and pure pipeline functions only.

## Flow

```
adapters ──fetch + normalize──▶ NormalizedImportRecord
                                      │
                                      ▼
                              import_staging  (guarded lifecycle)
   ┌──────────────────────────────────┼───────────────────────────────┐
   ▼                ▼                  ▼                ▼                ▼
validation      geocoding     duplicate-detection    review        (publish)
 (gate)        (resolve coords)  (new/match/conflict)  (human)      later, OOS
```

`ingested → validated → geocoded → deduplicated → pending_review → approved`.
A record never skips a gate (`transition` enforces `ALLOWED_TRANSITIONS`) and
**never reaches production until `approved`**. Promoting `approved → published`
into the app dataset is a separate, out-of-scope step.

## Files

| file | role |
|---|---|
| `schema/normalized-record.ts` | `NormalizedImportRecord` — the shared shape every adapter emits, with first-class provenance |
| `schema/source-registry.ts` | `source_registry` — catalog of WHERE data may come from (license, robots, trust, adapter) + `fromCouncilCatalogEntry` mapper |
| `schema/import-staging.ts` | `import_staging` — the staging buffer, status lifecycle, and the guarded `transition` |
| `pipeline/validation.ts` | composable `ValidationRule[]` + `runValidation` gate |
| `pipeline/duplicate-detection.ts` | `DuplicateDetector` interface + `GeoNameDuplicateDetector` default |
| `pipeline/geocoding.ts` | `Geocoder` / `GeocodeCache` interfaces + offline `NullGeocoder` |
| `pipeline/review.ts` | `ReviewQueue` interface + `applyReview` approval flow |
| `adapters/contract.ts` | `SourceAdapter` contract (the only network boundary) + `AdapterRegistry` |
| `adapters/in-memory-test-adapter.ts` | offline fixture adapter (3 fake records) that proves the pipeline |
| `orchestrator.ts` | `runImport` — drives one source through every stage; `MemoryStagingStore` |
| `example/run-demo.ts` | runnable offline dry-run demo with a self-check |
| `index.ts` | barrel for the whole surface |

## Run the demo

```bash
npm run import:unified-demo      # or: node importers/unified/example/run-demo.ts
```

Feeds the 3-record test adapter through `runImport` in **dry-run** mode with one
existing candidate, so fixture #1 is detected as an enrichable duplicate. It
makes no network calls and writes nothing; output is a console report ending in
`self-check: PASS ✓`:

```
stats: { fetched: 3, normalized: 3, validated: 2, rejected: 1,
         matches: 1, newRecords: 1, needsReview: 1, autoApprovable: 1 }
review queue (1): "בית הכנסת הגדול" — enrich (dup=match, enrich=[nusach, phone, address])
auto-approvable (1): "בית כנסת אור החיים"
rejected (1): "(blank)" — missing name
```

## `runImport(adapter, options)`

`adapter.fetch` is the lone network boundary; everything else is pure. Key
options:

- `dryRun` (default **true**) — run everything, write NOTHING to `store`.
- `geocode` (default false) + `geocoder` (default `NullGeocoder`, offline) —
  resolve coordinates only when a record arrives without them.
- `detector` (default `GeoNameDuplicateDetector`) + `candidates` — existing
  records to dedupe against.
- `store` (default none) — a `StagingStore`; only written when `dryRun: false`.

Returns `{ batch, staged, rejected, reviewQueue, autoApprovable, stats, dryRun }`.

## Consuming a source catalog (later)

The research catalog stays untouched; the registry is *seeded from a copy of its
rows*:

```ts
import { fromCouncilCatalogEntry } from './schema/source-registry.ts';

// `rows` = JSON.parse of a council-domain-catalog.json copy (read-only).
const entries = rows
  .filter((r) => r.confidence >= 0.7 && r.hasSynagogueDirectory)
  .map((r) => fromCouncilCatalogEntry(r, { adapterId: 'council-directory-v1' }));
// entries land as status:'draft' — promote to 'active' deliberately.
```

## Design notes

- **No hidden clocks / randomness.** Timestamps (`now`) and ids are injected, so
  every stage is deterministic and re-runnable, and staging history is stable
  across re-imports.
- **Interfaces over implementations.** `Geocoder`, `DuplicateDetector`,
  `ReviewQueue`, `AdapterRegistry` are swappable; the live Nominatim geocoder
  (`mikvahs/geocoder.ts`) and a real review UI plug in without touching staging.
- **Additive only.** Approval is the terminus here; nothing in this module
  writes to `src/data/generated/` or production `places`.

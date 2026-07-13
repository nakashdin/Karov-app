# Rebuild Architecture Redesign — Proposal (Phase 17, design only)

> Status: **PROPOSAL / PLANNING ONLY.** No code in this phase. No runtime change,
> no data deletion, no record modification. This document is the deliverable.

## 1. Problem statement (grounded in current data)

`importers/shared/database.ts › rebuildAppDataset()` reconstructs the app file
`src/data/generated/places.osm.json` from a **hard-coded one-file-per-TYPE** map:

```
CATEGORY_FILES = { synagogue: 'synagogues.osm.json', restaurant: 'restaurants.osm.json', mikveh: 'mikvahs.datagov.json' }
APP_TYPES      = ['synagogue', 'restaurant', 'mikveh']
```

But each *type* is fed by **many sources**. Reality of `places.osm.json` today
(4932 records):

| source (de-facto, by id convention) | records | in a category file? |
|---|---:|---|
| OSM synagogues + restaurants (`osm-…`) | 1936 | ✅ synagogues.osm.json / restaurants.osm.json |
| Council synagogues — SabaiApps (`rc-…`) | 1149 | ❌ direct-written |
| Gov mikvahs — data.gov.il (`mikveh-…`) | 470 | ❌ direct-written |
| ArcGIS synagogues — 8 cities (`arcgis:…`) | ~1291 | ❌ direct-written |
| Council mikvahs — SabaiApps (`rc-mikvah-…`) | 61 | ❌ direct-written |
| OSM + Tel-Aviv-GIS mikvahs (`mikveh-osm-…`, `mikveh-tlv-…`) | 25 | ❌ direct-written |

**Only 1936 of 4932 are reconstructable from category files. Running
`rebuildAppDataset()` today would DELETE 2996 records (61%).** Importers learned
to bypass rebuild and append directly to `places.osm.json` (hence the
`*.precouncils` / `*.premikveh` / `*.pre-phase16-open` backups). Provenance is
only an id-prefix convention — just **556/4932** records carry real provenance
fields (`extra.provenance` / `sourceName`, added in Phase 12).

**Root cause:** the model is *one file per type*; the world is *many sources per
type*. The data model cannot represent multiple sources, so the safe-rebuild
invariant was abandoned.

## 2. Design goals (from the requirements)

1. Never delete valid imported records. 2. Multiple independent sources.
3. Additive imports. 4. Rebuild from source datasets. 5. Provenance per record.
6. Rollback. 7. Orphan detection. 8. New importers with no special-case code.
9. Deterministic & reproducible.

## 3. Architecture

### 3.1 Source registry model (extend the existing one)
Reuse `unified/schema/source-registry.ts` (`SourceRegistryEntry`). Persist a
`src/data/generated/registry/source-registry.json` — the catalog of WHERE data
may come from. One entry per source with a **stable namespaced id**:

```
osm:synagogues · osm:restaurants · osm:mikvahs
datagov:mikve · council:<slug>:synagogues · council:<slug>:mikvah
arcgis:<city>:synagogues · gis:tel-aviv:mikvaot
```

Fields (already in the type): `id, displayName, kind, adapterId, produces[],
license, trust (0..1), robots, status (active|paused|retired)`. `trust` drives
field-level precedence; `status` drives inclusion in a rebuild.

### 3.2 Dataset registry (the missing layer)
The new piece. `registry/dataset-registry.json` maps each `sourceId` → a
**per-source dataset file** (one file *per source*, not per type):

```
src/data/generated/sources/<sourceId>.json   // e.g. sources/council__petah-tikva__mikvah.json
```

Each dataset file is an array of app-shaped `Place` records produced by that
source's last import; every record carries `provenance.sourceId`. The registry
row records: `sourceId, file, recordCount, contentHash, schemaVersion,
builtAt, status`. This replaces the 3-entry `CATEGORY_FILES` with an N-source,
self-describing list. **An import writes ONLY its own source file; it never
touches `places.osm.json`.**

### 3.3 Rebuild pipeline (`rebuildAppDataset` v2)
Pure, deterministic, the ONLY writer of `places.osm.json`:

```
1. load dataset-registry → active source files
2. read + per-record validate each source file (quarantine failures, never drop silently)
3. merge: key by stable id; cross-source duplicate DETECTION (geo+name); conflict resolution by trust
4. stable-sort by id; write places.osm.json + cities.osm.json
5. emit build-manifest.json (per-source counts, total, quarantined, duplicates, contentHash)
```

Determinism: stable sort, precedence by registry order/trust, injected `now`, no
`Date.now()`/randomness in the merge. **Lossless:** every source has a file, so
nothing is dropped. Same inputs → identical `contentHash`.

### 3.4 Merge strategy
- Records keyed by **stable namespaced id**; ids are unique within and across
  sources by construction → no accidental collisions.
- **Additive by default:** every record from every active source is kept. The
  merge never deletes a record because another source "looks similar."
- Cross-source records describing the *same facility* (different ids) are
  surfaced by duplicate detection but **not auto-merged** (see 3.6).

### 3.5 Conflict resolution
- **ID conflict** (same id from two sources — should not happen): higher
  registry `trust` wins; logged to the manifest.
- **Field conflict** (only after two records are *confirmed* same facility):
  higher-trust source wins per-field; empty fields back-filled from lower-trust
  sources (enrichment); contributing sources recorded in
  `provenance.contributors[]`. Automatic field overwrite across sources is
  **opt-in**, gated on a confirmed duplicate link — never silent.

### 3.6 Duplicate handling
- Build-time detection (reuse `unified/pipeline/duplicate-detection.ts`,
  geo+name) emits `reports/duplicates.json` (clusters of likely-same facilities
  across sources). **No automatic delete/merge** — preserves "never delete."
- Soft-dedup: a record may carry an optional `supersededBy` / `canonical:false`
  flag (set via review) to hide it from the app without deleting it. Hiding is a
  filter at emit time, fully reversible.
- Within-source duplicate ids are import errors (rejected before the file is
  written).

### 3.7 Rollback strategy
- Source files are **append-only versioned**: a re-import writes
  `sources/<id>.v<N>.json` and bumps the registry pointer; prior versions are
  retained. A bad import → repoint the registry to `v<N-1>` and rebuild.
- Each rebuild snapshots the prior `places.osm.json` + `cities.osm.json` to
  `backups/<buildId>/` and appends to `backups/manifest.json`.
- Rollback = restore a build's snapshot, OR repoint a source version + rebuild.
  A bounded ring of recent builds is kept.

### 3.8 Backup strategy
Formalize today's ad-hoc `*.pre-X.backup.json` into `backups/<buildId>/` with a
manifest (`buildId, timestamp, reason, files[], contentHashes`). Taken before
every rebuild and before every source-file version bump. Deterministic
`contentHash` lets a backup be verified, not just trusted.

### 3.9 Validation strategy
- **Per-record:** reuse `unified/pipeline/validation.ts` (name present, type
  supported, provenance present, coords-in-Israel, phone shape). Hard failures →
  quarantine file + manifest, **not** silent drop.
- **Per-build invariants (hard stop):** every record's `provenance.sourceId`
  resolves to a registered source; total ≥ Σ(min per active source); no
  `status:active` source contributes 0 unexpectedly; record count never drops
  more than a configured threshold vs the previous build without an explicit
  `--allow-shrink`.
- **Orphan detection:** a record in `places.osm.json` whose `sourceId` is not in
  the dataset registry (or absent from its source file) is an **orphan** →
  `reports/orphans.json`. Today that's literally the 2996 direct-written
  records; after migration it must be **0**.
- **Reproducibility:** the merged `contentHash` is the build identity; identical
  inputs reproduce it.

## 4. Migration strategy (non-destructive, the heart of this plan)

No deletion, no runtime change. `places.osm.json` content stays byte-equivalent.

1. **Snapshot** current `places.osm.json` (4932) as the immutable source of truth.
2. **Partition** it into per-source dataset files by deriving `sourceId` from the
   id-prefix convention (`osm-`→`osm:synagogues/restaurants`; `rc-`→`council:*`;
   `mikveh-`→`datagov:mikve`; `arcgis:<city>`→`arcgis:<city>:synagogues`;
   `mikveh-osm-`/`mikveh-tlv-`→`osm:mikvahs`/`gis:tel-aviv:mikvaot`). This
   back-fills the dataset registry FROM live data → nothing is lost.
3. **Back-fill provenance** (`provenance.sourceId`) where missing — additive
   optional field the UI ignores; no runtime change.
4. **Parity gate (acceptance):** v2 rebuild from the new source files must
   reproduce the EXACT current `places.osm.json` — identical id-set, count 4932,
   per-record deep-equal (canonical key order), stable `contentHash` across runs.
5. **Adopt:** only after parity, switch importers to write their source file +
   call v2 rebuild; deprecate direct-append + v1 `CATEGORY_FILES`.
6. v1 `rebuildAppDataset` is **guarded** (throws unless every live source has a
   dataset file) throughout the transition so it can never run destructively.

## 5. Implementation roadmap (each phase independently verifiable)

- **A — Inventory & partition** (read-only): finalize the `sourceId` taxonomy;
  partition script → source files + `dataset-registry.json` + orphan report.
  *Gate:* every one of the 4932 records maps to exactly one registered source; 0 orphans.
- **B — Parity rebuild:** implement `rebuildAppDataset` v2 (merge from dataset
  registry). *Gate:* v2 output === current `places.osm.json` (id-set identical,
  count 4932, `contentHash` stable across runs).
- **C — Safety rails:** validation invariants, backup/manifest, orphan +
  duplicate reports, rollback command. *Gate:* a deliberately-broken source file
  is quarantined (not propagated); rollback restores the prior build.
- **D — Importer adoption:** refactor importers (Tier-A/Phase-16/council/ArcGIS/
  OSM) to write a source file + invoke v2; retire direct-append + v1. *Gate:* a
  NEW importer needs only a registry entry + a source file — no edits to rebuild code.
- **E — Cutover:** regenerate `places.osm.json` via v2; retire v1; document.

No runtime change until E, and even then the output is byte-equivalent.

## 6. Risks & mitigations

| risk | mitigation |
|---|---|
| id-prefix ambiguity during partition | explicit per-prefix mapping table + **0-orphan** acceptance gate; manual review of any unmatched |
| serialization/field-order drift breaks "parity" | canonical serializer (stable key order); compare by id-set + per-record deep-equal, not raw bytes |
| app reads `places.osm.json` directly (`OsmPlacesRepository`) | v2 emits the same file/shape → no app change; covered by the parity gate |
| provenance back-fill mislabels a source | cosmetic only (no data loss); reviewable; corrected by re-partition |
| late-arriving sources (synagogues grew mid-project) | partition is **re-runnable**; registry is open-ended |
| scope creep into unrelated importer refactors | v1 stays working until D; additive only; one source at a time |

## 7. Compatibility with the current project

- **Reuses** the existing unified schema (`source-registry.ts`,
  `normalized-record.ts`, `import-staging.ts`). The dataset registry is the
  missing "published datasets" layer between staging and the app file.
- **App layer unchanged:** `OsmPlacesRepository` keeps reading
  `places.osm.json` as `Place[]`; v2 emits the same shape.
- **Place schema ready:** optional `extra`/provenance fields already exist
  (Phase 12) → provenance back-fill fits without affecting synagogue/restaurant.
- **Satisfies the open task** "Fix rebuildAppDataset destructive rebuild": v1 is
  guarded immediately (Phase A) and replaced losslessly (Phase B+).
- **No runtime behavior change, no deletion, no record modification** —
  provenance is additive optional fields the UI ignores; cutover output is
  byte-equivalent to today's dataset.
```

# Data Architecture Investigation

> **Status: INVESTIGATION + RECOMMENDATION. No implementation.**
> Every number below was measured against `HEAD` on 2026-08-24, not estimated.
> Reproduction scripts are listed in §0.

---

## 0. What was measured, and how

| Claim | Method |
|---|---|
| 68 direct writers of the live dataset | AST-ish scan of all 262 `scripts/` + `importers/` source files for `writeFileSync/writeJson` targeting `places.osm.json`/`cities.osm.json`, including const-indirection |
| Field coverage per category | Full scan of all 7,471 records |
| Startup cost | `JSON.parse` + sanitize + MiniSearch `addAll` timed with `hrtime` on this desktop |
| Payload economics | `zlib.gzipSync`/`brotliCompressSync` on the real artifacts |
| Partition coverage | Re-ran the Phase-17A id-prefix taxonomy against today's 7,471 |
| Source liveness | Live HTTP against data.gov.il CKAN, chabad.org, GovMap, Tzohar, Overpass |

Live figures: **7,471 places · 679 cities · 5.0 MB raw JSON · 12 place types · 37 top-level keys · 1,503 distinct id prefixes.** `npm run data:validate` passes.

---

## 1. Diagnosis

### 1.1 The one fact that explains everything else

**There is no ingestion layer. There are 68 programs that write directly to the production table.**

```
262 script/importer source files
 68  write places.osm.json / cities.osm.json directly   ← the "pipeline"
104  read it
```

Almost all 68 are one-shot: `fix-humus-eli-encoding.mjs`, `import-golda.mjs`, `patch-story-and-bakikar.mjs`, `update-pizza-story-hours.mjs`. The current dataset is the accumulated residue of 68 scripts run in an unknown order at unknown times against unknown upstream states. **It cannot be reproduced.** If `places.osm.json` were lost, re-running everything in `scripts/` would not reconstruct it.

That single fact causes almost every downstream symptom: no provenance (there was no place to put it), no rollback (no build to roll back to), no refresh (no adapter to re-run), no conflict resolution (last writer wins by definition), and `import:all` being able to delete 61% (the "rebuild" has no idea 68 other writers exist).

### 1.2 The architecture you are asking for already exists in this repo

`importers/unified/` contains a complete, typed design:

```
adapters/contract.ts          SourceAdapter: fetch() = the single network boundary, normalize() = pure
schema/source-registry.ts     SourceRegistryEntry: id, adapterId, license, robots, trust, status
schema/normalized-record.ts   NormalizedImportRecord + RecordProvenance (incl. raw payload for re-normalize)
schema/import-staging.ts      staging layer
pipeline/validation.ts        per-record validation
pipeline/duplicate-detection.ts   geo+name clustering
pipeline/geocoding.ts         address resolution stage
pipeline/review.ts            human gate
orchestrator.ts               run one source end to end
REBUILD-ARCHITECTURE.md       the full design doc (Phase 17)
```

It maps almost exactly onto the shape you proposed:
`External Source → Source Adapter → Raw/Staging → Normalization → Validation → Canonical`.

**And it was proven.** `output/rebuild-v2-parity-report.json`:

```
totalRecords 4932 → 4932   idSet missing 0, extra 0   deepEqual mismatched 0
distinctSources 38          recordsOrphan 0
contentHashCanonical 2fd48d6b44f6f949   parityExact true
```

A v2 rebuild reconstructed the entire dataset from per-source files, record-for-record, deterministically. `ArcgisRestAdapter` is a real, correct implementation of the contract — it reprojects via `outSR=4326` specifically because a pure TM inverse omits the Israeli datum shift (~50–80 m).

**Then it stopped.** Phases C (safety rails), D (importer adoption), E (cutover) were never done. Nothing is wired to `npm run` except a demo. Meanwhile the dataset grew 4,932 → 7,471 and every new record arrived through the old direct-write path.

**This changes the recommendation fundamentally: you are not designing an ingestion architecture, you are finishing one.**

### 1.3 Two datasets with opposite failure modes

| | Institutional | Curated |
|---|---|---|
| Types | synagogue, mikveh, chabad, graves | restaurant, cafe, bakery, juice bar, winery… |
| Records | **5,315 (71.1%)** | **2,156 (28.9%)** |
| Partitionable to a source | **100% — 0 orphans** | **0% — all 2,156 are orphans** |
| id prefixes | ~38 stable namespaces | **477 prefixes, 430 appearing exactly once** |
| Website / hours / description | **0% / 0% / 0%** (synagogues) | **84% / 79% / 91%** (restaurants) |
| Refreshable from upstream | yes, adapters exist | mostly no |

The measured re-partition against today's data:

```
covered by the 17A taxonomy : 5315 (71.1%)
NOT covered (new orphans)   : 2156 (28.9%)
orphans by type             : restaurant 1386, cafe 387, juice_bar 107,
                              coffee_cart 81, bakery 67, winery 64,
                              ice_cream_parlor 44, fast_food 20
orphans with NO origin field:   52
```

**Every single unpartitionable record is food.** The half of the dataset that carries the product's value and its entire religious risk is the half with no ingestion architecture at all. That is not a coincidence — food had no upstream, so it was hand-built, and hand-building is what the 68 scripts are.

Encouragingly, only **52 records** have no origin field whatsoever. The other 2,104 carry `extra.provenance`, `extra.dataSource`, `sourceUrl` or `source`. The information needed to partition them mostly exists; it is just not in a field anything reads.

---

## 2. Which categories can we confidently support

Source-first, as requested. I searched the national portal by candidate category rather than by our existing catalog.

### 2.1 What actually exists

| Dataset | Publisher | Rows | Cadence | Last modified | Verdict |
|---|---|---:|---|---|---|
| `mikve` | המשרד לשירותי דת | 648 | manual | **2026-08-12** | ✅ statutory, current |
| `mohalim-list` | הרבנות הראשית | 372 | **Weekly** | 2026-07-16 | ✅ with certificate expiry dates |
| `list_of_rabbis_for_kidushin` | הרבנות הראשית | — | — | 2026-08-11 | ✅ current |
| `mazon` (imported food products) | הרבנות הראשית | **34,827** | **Weekly** | 2026-08-20 | ✅ products, not places |
| `861` רשימת בתי דין | בתי הדין הרבניים | — | — | 2026-02-15 | ✅ |
| `citiesandsettelments` | CBS | 1,310 | — | 2026-08-16 | ✅ official סמל ישוב |
| `kosherbusiness` | המשרד לשירותי דת | **63** | Quarterly *declared* | **2026-03-24** | ⚠️ see below |
| `synagogues-br7` (Be'er Sheva) | עיריית באר שבע | 270 | Yearly | 2026-07-28 | ⚠️ one city, has WGS84 lat/lon |
| `943` (Haifa synagogues) | עיריית חיפה | — | NA | 2023-03-21 | ⚠️ stale 3 yr |
| `synagogues` (Petah Tikva) | עיריית פתח תקוה | **0** | NA | 2023-03-21 | ❌ empty |
| `talmudiccollege` (ישיבות) | המרכז למיפוי ישראל | — | — | 2023-07-09 | ⚠️ stale |
| בתי עלמין / חברה קדישא / עירוב / גמ״ח / שיעורי תורה | — | — | — | — | ❌ **nothing published** |

### 2.2 The `kosherbusiness` finding — important, and it corrects an earlier conclusion

I previously reported that no national machine-readable kashrut establishment source exists. That was **too strong**. The precise position:

```
title      בתי עסק המחזיקים בתעודת כשרות
publisher  המשרד לשירותי דת   (the statutory regulator)
license    Other (Open)
declared   Quarterly
rows       63
councils   1  ("יקנעם עילית")
modified   2026-03-24   ← 5 months stale against its own declared cadence
schema     council_num, council_name, business_name, city_name, street_name,
           location, business_phone, business_type, kosher_type (רגיל|מהדרין),
           parve, dairy, meat, supervisor_name, supervisor_phone
```

So: **the national kashrut dataset exists in mandate and in schema, but not in coverage** — one religious council out of ~130, and already overdue. 43 of 63 rows carry a location.

That is a materially different instruction than "no source exists":

1. **Adopt its vocabulary now.** `kosher_type ∈ {רגיל, מהדרין}` is exactly the app's `kosherLevel`. `parve/dairy/meat` is exactly `KosherCategory`. `supervisor_name` is a field the app doesn't model but a user would want. Aligning our canonical schema to the regulator's costs nothing today and makes adoption free if coverage arrives.
2. **Poll it quarterly, expect nothing.** One cheap scheduled check. If it ever expands to 130 councils it becomes the single most valuable source in the project overnight.
3. **Do not plan around it.** Design the kashrut chain as if it will never grow, because for 5 months it hasn't.

Its `business_type` vocabulary is also the state's own catalog, and it is instructive: `אולמות · קייטרינג · מסעדות · מזנון · פיצה · מפעל מזון · עוגות ועוגיות · גלידות · פיצוחים · מרכולים · חומוסיה · מאפיות וקונדיטוריות · איטליז · דגים · מזון מהיר`. Note it contains **מרכולים and איטליז** — the "מזון לבית" category already parked as future work.

### 2.3 Recommendation: the catalog, driven by sources

| Tier | Categories | Records | Why | Cost to keep reliable |
|---|---|---:|---|---|
| **A — support with confidence** | **synagogue**, **mikveh** | 5,081 | Adapters exist and work. Mikveh has a statutory upstream. Synagogues have no national source but ~12 municipal ArcGIS/council sources already partitioned with 0 orphans | **Low.** Quarterly adapter re-runs, agent-executable |
| **B — support, permanently human-owned** | **restaurant, cafe, bakery, juice bar, ice cream, coffee cart, fast food** | 2,213 | Highest product value; highest religious risk; **no upstream will ever make this cheap** | **High and permanent.** Budget for it explicitly |
| **C — cheap win, expand** | **chabad_house** | 139 | `api.chabad.org/api/v2/chabadorg/centers/` returns HTTP 200, 1.25 MB, no auth, robots-sanctioned. The repo's claim that it is legally gated is wrong | **Very low.** One API call |
| **D — keep, do not invest** | **tzaddik_grave** | 38 | Near-zero churn, low stakes, weak sources (Wikidata/OSM) | Negligible. Yearly at most |
| **E — restructure, don't delete** | **winery** | 64 | Not a "place to eat"; it is a producer. Belongs to a products/producers axis, not the food catalog | — |
| **F — do not add yet** | cemeteries, eruvin, gemachim, shiurim, batei din | — | **No published source exists** for the first four. Adding them means becoming the source of truth for a new category while the food category is already under-resourced | Would be very high |
| **G — genuinely new, worth a product decision** | **mohalim** (372, weekly, with expiry), **rabbis for kidushin** | — | Authoritative, fresh, free, and *already carries certificate expiry* — the exact schema shape the kashrut chain needs | Low. **But these are people, not places** — see §5.3 |

**The direct answer to "which categories should we support initially":** the ones you already have, minus a restructure — with the honest caveat that **Tier B is 30% of the records and ~100% of the maintenance burden**, and no source strategy changes that. Do not add Tier F/G categories until Tier B is under control.

---

## 3. Sources per category — API vs parser

### 3.1 API-based (low maintenance risk — the schema is a contract)

| Source | Category | Access | Rate/cost | Persist locally? | Dependency risk |
|---|---|---|---|---|---|
| **data.gov.il CKAN** | mikveh, cities, mohalim, kashrut(63) | `package_show` + `datastore_search`, no auth | free, unmetered in practice | ✅ Open licence | **Low.** CKAN is a stable standard; the portal has been up throughout |
| **Municipal ArcGIS REST** | synagogue (8 cities) | `/query?outSR=4326&f=json`, paged | free | ✅ | **Low–medium.** Layer URLs change on municipal GIS migrations; the adapter is config-driven so recovery is a config edit |
| **chabad.org Centers** | chabad_house | `GET /api/v2/chabadorg/centers/` | free, unpaginated, 1.25 MB | ✅ robots explicitly `Allow: /api/v2/chabadorg/centers/` | **Medium.** Undocumented, unversioned, could vanish without notice |
| **GovMap `TldSearch`** | coordinates (all) | `DetailsByQuery?lyrs=257`, tokenless | free | ✅ (results, not the DB) | **High-consequence.** The working parameterization exists **only in this repo**, in `importers/chabad/geocode.ts:27` — it is in no public document. Treat that line as a critical asset |
| **Overpass / OSM** | fallback, all | Overpass QL | free, rate-limited, slow (8.4 s just for `/api/status`) | ✅ ODbL — **attribution required** | Low, but ODbL attribution is a legal obligation the app must render |

### 3.2 Parser-based (we own the breakage)

| Source | Category | What breaks it | Current state |
|---|---|---|---|
| **Tzohar certificate PDFs** | kashrut evidence | Layout change; new PDF generator | **Working, and the cache defect is fixed** — `isCacheStale()` re-fetches whenever the known expiry is inside `--window` (default 60 days), whenever fetch metadata is missing, and whenever no date was ever resolved; `--refresh` forces it. A failed re-fetch **never** extends, clears or guesses a date. Consequence for the 2026-09-11 cliff: those 152 certificates are already inside the default window, so an ordinary run re-fetches them without any flag |
| **Religious-council directories** (`rc-`, 1,208 records) | synagogue, mikveh | Any CMS change on ~20 council sites | Ran once; no re-run path |
| **Restaurant chain sites** (~40 chains) | food | Every redesign | 40 one-shot scripts, none re-runnable |
| **Tzohar de-supervision list** (`?page_id=20089`) | **negative kashrut signal** | — | **Not consumed.** This is the only published *withdrawal* signal in Israel and the project's own rule ("no certificate → no record") implies it should be driving corrections |

**Architectural consequence:** parser sources must be *isolated behind the same adapter contract as API sources* and must carry three things API sources don't need: a **recorded raw payload** (so a parser fix can re-normalize without re-fetching — `RecordProvenance.raw` already provides this), a **schema-drift check** (assert expected fields exist before emitting; fail the run rather than emit empties), and a **volume guard** (a parse yielding 30% fewer records is a parser failure until proven otherwise — never a deletion).

---

## 4. Is the current catalog structured correctly?

**No.** Four concrete defects, all measured.

### 4.1 302 records are unreachable by category — including the best-curated data in the project

`filterPlaces.ts:23` — `EAT_TYPES = {restaurant, cafe, coffee_cart}`. `ListScreen.tsx:30-36` — the eat sub-tabs are only `הכל / מסעדות / מסעדות שף / בתי קפה / עגלות קפה`. `CATEGORY_TABS` (line 46) offers only `restaurant, synagogue, mikveh, chabad_house, tzaddik_grave`.

There is therefore **no filter path to**:

| Type | Records | Coverage of that data |
|---|---:|---|
| `juice_bar` | 107 | **100% address, website, hours, description** |
| `bakery` | 67 | 100% / 85% / 90% / 97% |
| `winery` | 64 | 100% / 89% / 77% / 100% |
| `ice_cream_parlor` | 44 | **100% on every field** |
| `fast_food` | 20 | 100% / 55% / 40% / 90% |
| **Total** | **302** | |

`ice_cream_parlor` and `juice_bar` are the two best-curated categories in the entire 7,471-record dataset, and a user cannot browse to either. They appear only under the top-level "all" tab or free-text search. Real research effort is invisible in the product because the catalog has no slot for it.

### 4.2 `fast_food` is simultaneously a type and a subtype

```ts
type PlaceType    = 'restaurant' | 'fast_food' | ... ;
type PlaceSubType = 'fast_food' | 'chef_restaurant';
```
A record can be `type: 'restaurant', subType: 'fast_food'` **or** `type: 'fast_food'`, and the filters treat them as unrelated. This is the type system telling you the taxonomy has two axes crammed into one field.

### 4.3 Category-specific fields are hiding in `extra`

976 records carry an `extra` object with 20+ distinct keys, of which the mikveh block is clearly a real schema:

```
extra.forWomen 461 · extra.forMen 461 · extra.forDishes 461 · extra.brideRoom 461
extra.accessibility 495 · extra.responsibleWorker 459
```

461 mikvehs carry structured accessibility and audience data that is **unqueryable, untyped, unvalidated and unsearchable** because it lives in a `Record<string, unknown>`. Meanwhile `mikvehGender` — a free Hebrew string — is a first-class field on 126 records. The modeling is inverted.

### 4.4 `cities` is not a dimension, it is a string list

```
679 rows · fields: id, name · id === name on 100% of rows · 9 rows with zero places
```

`cityId` is a Hebrew display string used as a join key. No `סמל ישוב`, no coordinates, no district, no type (city / moshav / regional council). This is why the Dead Sea outlier problem is unsolvable — `rc-` regional-council "cities" are landforms up to 50 km long, and nothing in the model can express that.

### 4.5 Recommendation — separate the axes

```
entity        place | (later: person, product)
kind          synagogue | mikveh | food | chabad_house | grave      ← what it IS
subkind       restaurant | cafe | bakery | juice_bar | ice_cream |  ← align to kosherbusiness.business_type
              coffee_cart | fast_food | winery | catering | hall
attributes    typed per-kind blocks (mikveh: {forWomen, forMen, forDishes, brideRoom, accessibility}
              synagogue: {nusach}  food: {kashrut{...}, category, cuisine[]})
tags          free, additive, non-structural
```

Rules that fall out: a filter UI is generated from `kind`+`subkind`, so **adding a subkind can never again strand 302 records**; "food" becomes one kind with subkinds, so `eatAll` is `kind === 'food'` and cannot drift; per-kind attribute blocks are typed and validated instead of `extra`.

---

## 5. Recommended canonical data model

### 5.1 Layering — three models, and where separation earns its cost

| Layer | Lives where | Shape | Why separate |
|---|---|---|---|
| **Raw / staging** | `data/raw/<sourceId>/<batchId>.json`, git-ignored or LFS | untouched upstream payload | Re-normalize after an adapter bug **without re-fetching**. Already supported by `RecordProvenance.raw` |
| **Canonical** | `src/data/sources/<sourceId>.json` + registry | rich, full provenance, per-source, one file per source | The audit surface. Never shipped to a client |
| **Serving / client** | `dist/data/*.json`, content-hashed | slim, denormalized, no provenance | **Separate: yes.** Provenance is ~4% of bytes but 100% of the schema-churn risk. Clients must not break when provenance evolves |

**Canonical ≠ serving: worth it.** **Serving ≠ client: not worth it** — keep them byte-identical. Three shapes is one more than the problem has; a distinct client model would buy nothing here and doubles the mapping bug surface.

### 5.2 Canonical record

```jsonc
{
  "id": "arcgis:tel-aviv:synagogues::4471",   // stable: sourceId::sourceRecordId (makeRecordId already does this)
  "entity": "place",
  "kind": "food",
  "subkind": "restaurant",
  "status": "active",                          // active | closed | superseded | unverified   ← MISSING TODAY

  "name":   { "he": "…", "en": "…" },          // localized from day one; today it is a bare string
  "address":{ "he": "…" },
  "cityRef": "IL-5000",                        // FK → cities by סמל ישוב, NOT a Hebrew display string

  "location": { "latitude": 32.07, "longitude": 34.78 },
  "locationMeta": {
    "source": "govmap-ADDR_V1",                // enum, written ONLY by a sanctioned geocoder module
    "precision": "address",                    // exact | address | city | region
    "verifiedAt": "2026-08-24"
  },

  "attributes": { /* typed per kind — replaces `extra` */ },

  "kashrut": {                                 // food only
    "certifierId": "badatz-beit-yosef",        // CONTROLLED VOCAB — replaces 261 free-text spellings
    "level": "mehadrin",                       // aligns to kosherbusiness.kosher_type
    "category": "meat",                        // aligns to kosherbusiness parve/dairy/meat
    "validUntil": "2026-09-11",
    "evidence": "certificate",                 // certificate | authority-list | operator-claim | none
    "supervisor": "…"                          // kosherbusiness.supervisor_name
  },

  "provenance": {
    "sourceId": "tzohar:certificates",
    "sourceRecordId": "…",
    "sourceUrl": "https://…",
    "method": "official-pdf",                  // api | bulk-download | official-pdf | site-scrape | manual-entry
    "fetchedAt": "2026-08-24T10:00:00Z",       // MACHINE-WRITTEN. Never a literal
    "verifiedAt": "2026-08-24",                // set ONLY when something actually checked
    "batchId": "tzohar-2026-08-a",             // groups a run → auditable and revertible wholesale
    "contributors": [ /* other sources that enriched fields */ ]
  },

  "schemaVersion": 2
}
```

**Six deliberate decisions:**

1. **`status`** — the highest-leverage single field. Additive-only was written to prevent data loss; with no status field it instead *guarantees stale records live forever*. `status` makes retirement a **correction**, not a deletion, so the rule stays literally true and the quality story unblocks.
2. **`fetchedAt` / `verifiedAt` split** — fixes the measured fiction that 100% of `lastVerifiedAt` values are 2026 and 66.8% are in a single month. Today's field records *when a human typed a date*.
3. **`batchId`** — makes a bad run findable and revertible. The 28 Nominatim coordinates mis-stamped `waze` would have been one batch to unwind.
4. **`certifierId` controlled vocabulary** — 261 free-text spellings today; `בד"ץ בית יוסף` / `בד"צ בית יוסף` / `בית יוסף` are one certifier written three ways. Expiry tracking and the kashrut filter are **unfixable in principle** without this.
5. **`cityRef` by סמל ישוב** — turns cities into a real dimension and makes the regional-council outlier problem expressible.
6. **Localized name/address from day one** — the app already ships 5 languages. Retrofitting i18n onto 7,471 bare strings later is far more expensive than accepting the shape now, even while only `he` is populated.

### 5.3 Should mohalim / rabbis go in this dataset?

**They are a different entity, and that is the point.** The `entity` discriminator exists precisely so a person-typed record can share provenance, status, sync and delivery machinery without contaminating `Place`. `mohalim-list` is a good test case — national, weekly, authoritative, and it already carries `certificationexpiresengdate`, i.e. exactly the certificate-expiry shape the kashrut chain needs. **But it is a product decision, not an architectural one, and it should wait until Tier B is healthy.**

---

## 6. Ingestion architecture

Adopt the design already in `importers/unified/`, with four additions.

```
┌───────────┐   fetch()    ┌──────────┐  normalize()  ┌────────────┐
│  Source   │─────────────▶│   RAW    │──────────────▶│ NORMALIZED │
└───────────┘  (network    │ staging  │   (pure, no   │  records   │
   ▲           boundary)   └──────────┘    IO)        └─────┬──────┘
   │                                                        │
   │                                                  validate + guards
   │                                                        ▼
┌──┴────────────┐                                    ┌──────────────┐
│ SOURCE        │                                    │ CANONICAL    │
│ REGISTRY      │◀── trust, status, licence, robots  │ per-source   │
└───────────────┘                                    │ files + reg. │
                                                     └──────┬───────┘
                                                    deterministic merge
                                                            ▼
                                              ┌──────────────────────┐
                                              │ BUILD ARTIFACTS      │
                                              │ index / detail /     │
                                              │ search, content-hash │
                                              └──────────────────────┘
```

**Rule that makes it work: the merge step is the *only* writer of the published dataset.** Today it is one of 69.

### Four additions the existing design lacks

1. **Per-batch displacement guard.** *This is the one that closes the actual hole.* The documented 111 km Pizza Hut incident was **not** caught by `check-city-outliers` — that record had one peer and landed in the `too-few-peers` blind spot. A peer-independent rule catches it: *any record whose coordinate moves > 5 km in one batch is a HARD failure pending review.* No clustering, no blind spot.
2. **Volume guard on every source.** A source returning < 95% of its previous count fails the run. This is what makes a parser break look like a parser break instead of 30% of a category being deleted — your §6 concern, directly.
3. **Sanctioned-writer rule for coordinates.** `locationMeta.source` may only be written by the geocoder module. The 111 km incident happened because a script **bypassed a correct in-repo geocoder**; the script's own rules were fine. Enum validation cannot catch a lie; restricting who may write the field can.
4. **`kosherbusiness` vocabulary alignment**, per §2.2.

### Fallback and multi-source

The registry's `trust` already seeds this. Resolution rules:

- **Additive by default** — every record from every active source is kept; the merge never deletes because another source "looks similar."
- **Field-level precedence, not record-level.** One restaurant's *name* comes from a chain site, its *coordinates* from GovMap, its *kashrut* from a certificate, its *city* from CBS. The unit of truth is **(field-group × source)**, never the whole record.
- **Enrichment is free; overwrite is gated.** Empty fields backfill from any source. Overwriting a non-empty field requires a *confirmed* duplicate link and higher trust, and is recorded in `provenance.contributors[]`.
- **Never overwrite a working value with a blank.**
- **A certificate beats everything on kashrut. Nothing overrides a certificate.**

Field-group precedence, concretely:

| Field group | Wins | Never wins |
|---|---|---|
| coordinates | GovMap `ResultType:1` > municipal ArcGIS native point > Waze-by-address > OSM | Nominatim — **never** a source of truth |
| name | source-native (municipal registers use legal names; users search colloquial ones) | a geocoder |
| kashrut | certificate > certifier's published list > operator claim | any scrape |
| address, city | GovMap / CBS | hand entry |
| hours, phone, site | operator/chain site | anything older |

### Deduplication and entity resolution

`pipeline/duplicate-detection.ts` (geo + name) already exists. Use it to **detect and report, never to auto-merge** — that preserves additive-only. When two records are confirmed the same facility, set `supersededBy` on one and filter it at emit time: reversible, auditable, no deletion. `OsmPlacesRepository` already resolves merged ids via `extra.mergedFrom`, so shared links survive — that pattern is correct and should be generalized.

---

## 7. Reliability, survivability, rollback

Mapped against the project's own real incidents rather than hypotheticals:

| Real incident | Caught today? | What actually catches it |
|---|---|---|
| Pizza Hut moved **111 km** to Kibbutz Afikim | **No** — one peer, `too-few-peers` blind spot | Per-batch displacement guard (§6.1) |
| 28 Nominatim coords stamped `locationSource: waze` | No — an enum check cannot detect a lie | `batchId` referential integrity + sanctioned-writer rule |
| Waze searched by **name** instead of address | No — the correct script was bypassed entirely | Sanctioned-writer rule; HARD-fail `source ∈ {waze,govmap}` combined with `precision: city` |
| **12 expired certificates shipping now** | No — `validate-data.mjs` never reads `certificateValidUntil` | `cert-expiry --strict` in `npm run verify` |
| `import:all` deleting 61% | Only *after* the file is overwritten | Volume guard + `--i-mean-it`; better, delete the command |
| Tzohar PDF cache never invalidated | No — re-extracts stale expiry, reports success | TTL + `--refresh`; unconditional fetch when `validUntil` within 60 days |

**Recovery model:** source files are append-only versioned (`sources/<id>.v<N>.json`); a bad import repoints the registry to `v<N-1>` and rebuilds. Every rebuild snapshots the prior artifacts under `backups/<buildId>/` with content hashes. Rollback is either restoring a build or repointing a source version — both are one command, both are auditable.

**The validator's current blind spot, measured:** `foodWithoutKashrut` reports **20**, because a record with `kosherAuthorityGroup: "unknown"` counts as *having* kashrut. The true figure for food with no usable kashrut signal is **847 (38.3%)** — and `unknown` is the value the kashrut filter itself reads. The gate is green because it is asking the wrong question.

**Ratchets to add** (the existing mechanism is sound — `--update` uses `Math.min`, so it can only tighten; it just covers too few fields):

| Key | Today |
|---|---:|
| `missingSource` *(already ratcheted)* | 3,327 |
| `missingLocationSource` | 5,726 |
| `missingLocationPrecision` | 4,895 |
| `kashrutAuthorityUnknown` | **847** |
| `foodWithoutCertEvidence` | 1,284 |
| `freeTextCertifier` (no `certifierId`) | ~1,560 |
| `unpartitionedRecords` | **2,156** |

---

## 8. Storage, cost, and delivery to Web / iOS / Android

### 8.1 The measurements that decide this

```
places.osm.json          5.0 MB raw   0.48 MB gzip   0.34 MB brotli
web JS bundle            9.74 MB raw  1.13 MB gzip   0.85 MB brotli   ← dataset is INLINED
list-view fields only    1.73 MB raw  (35% of the dataset; the other 65% is detail)
startup, this desktop    33 ms parse + 212 ms MiniSearch index = 247 ms BLOCKING at module load
MiniSearch index         1.71 MB serialized   heap after load 47 MB
```

### 8.2 What this means

**The network is not your problem. The main thread is.**

340 KB brotli for the whole country is small — smaller than a single hero image. **Do not build a delta-sync system.** It would be significant complexity bought against a 340 KB payload.

The real cost is `buildIndex()` running synchronously at module import in `OsmPlacesRepository.ts:45`: **247 ms of blocked main thread on a desktop CPU, before any UI**. A mid-range Android device is 3–6× slower — call it **0.75–1.5 s of frozen startup**, and it scales linearly with record count. At 20,000 records it becomes multi-second on every cold start. This is almost certainly a contributor to the "loading UI" problems reported earlier.

Two other structural costs:

- **One bundle hash for code + data.** Correcting one restaurant's phone number changes the JS bundle hash and invalidates the service-worker precache → every web user re-downloads 0.85 MB, and every native user takes a full OTA. Data and code have completely different change rates and are welded together.
- **`assetBundlePatterns` / `runtimeVersion: fingerprint`** is correctly configured — a data change does not change the native fingerprint, so data ships over OTA. Good. But it ships as the whole JS bundle.

### 8.3 Recommended delivery

Split the artifact by access pattern, not by category:

| Artifact | Content | Raw | ~brotli | Loaded |
|---|---|---:|---:|---|
| `index.v{hash}.json` | id, name, kind, subkind, cityRef, location, kashrut summary | 1.73 MB | ~120 KB | **eagerly** — everything list, map and filter need |
| `search.v{hash}.json` | **pre-built** MiniSearch index (`MiniSearch.loadJSON`) | 1.71 MB | ~130 KB | eagerly, off the critical path |
| `detail/{kind}.v{hash}.json` | hours, description, socials, provenance, certificates | 3.26 MB | ~210 KB | **lazily**, on first place-detail open |
| `meta.json` | dataset version, per-artifact hashes, built-at | <1 KB | — | first, cheap |

Wins, all measured rather than assumed: **the 212 ms index build becomes a `loadJSON` deserialize** (build once at CI, not once per device per launch); the eager payload drops from 5.0 MB to 1.73 MB raw; and **code and data get independent cache lifetimes**, so a data fix stops invalidating the code bundle.

**Same three artifacts on all three platforms.** Web caches them in the service worker; iOS/Android ship the last-known-good copy in the binary and refresh in the background via `expo-file-system`. One shape, one cache key, one version check.

### 8.4 Synchronization model

**Recommended: versioned full-artifact replacement with a content-hash check.** Not delta sync.

```
launch → serve bundled/cached artifacts immediately (never block UI on network)
       → background: GET meta.json  (<1 KB)
       → hash differs? download changed artifacts only, atomically swap, no user-visible reload
       → any failure at any step? keep last-known-good. Silently. Forever if needed.
```

This satisfies the offline requirement (already verified working — the SW activates, caches `/`, and an offline reload renders the full UI), it never leaves a user with a half-updated dataset, and it costs ~120–460 KB per data release instead of 850 KB.

**Revisit delta sync when either** the compressed dataset exceeds ~2 MB **or** record count exceeds ~50,000. At 7,471 records it is premature.

### 8.5 Do you need a backend?

**Not yet — and `SupabasePlacesRepository` should stay a stub.** At 7,471 records / 340 KB, a build-time artifact in git is *better* than a database: reviewable diffs, free rollback, zero infra cost, and additive-only + rollback come free from version control.

Wire a real backend when — and only when — one of these arrives: **user-generated content** (`submitReport` currently `console.log`s and drops the report on the floor), cross-device favourites, or >50k records. The repository interface already isolates that decision to one line in `config.ts`, which is the correct design and should be preserved.

---

## 9. Adding sources and categories without redesign

Once §6 is adopted, the cost of each is bounded:

| Change | Work required |
|---|---|
| New source, existing category | Registry entry + adapter (or reuse `ArcgisRestAdapter` with a config row). **No rebuild-code change** |
| Fallback source | Registry entry with lower `trust`. Precedence is data, not code |
| Replace a source | Flip old to `status: retired`, add new. Records persist; the merge stops including them |
| New category | Add `kind`/`subkind` + a typed attribute block. **Filter UI generates from the catalog** — this is what prevents another §4.1 |
| New client | Reads the same artifacts. Adapters are invisible to it |

**Adding a source must never require a change in Web, iOS or Android.** The serving artifact schema is the contract; adapters are behind it. That is the whole point of the separation in §5.1.

---

## 10. Findings in the current implementation

### Must address before continuing to build on this foundation

| # | Finding | Evidence |
|---|---|---|
| **B1** | ~~12 expired kosher certificates are live in the app, two by ~11 months. The gate never reads `certificateValidUntil`~~ **Addressed 2026-08-24.** Runtime state (`src/utils/certificate.ts`) now distinguishes valid/expired/unknown/none and drives a clearly-labeled "תעודת כשרות פגה" in `PlaceDetailScreen`/`PlaceCard`; the 12 stay visible (browsing/search) but drop out of certification-specific filters (`filterPlaces.ts`). Also found and fixed in the same pass: 29 Humus Eliyahu records had a fabricated `certificateValidUntil` with no real certificate document behind it (commit `0bad8b9`) — stripped, reverted to state "unknown". Still open: B5 (`certifiedBy` normalization) and the broader schema-v2 work below | measured against 2026-08-24 |
| **B2** | **`npm run import:all` deletes 4,544 records (60.8%)** and strips kashrut/website/description from all 2,927 survivors (`toAppPlace` keeps 9 fields). No backup, no dry-run | `importers/shared/database.ts:44-87` |
| **B3** | **68 direct writers to the production table**; the dataset is not reproducible | measured across 262 files |
| **B4** | **No `status` field** → additive-only cannot express "closed", so stale records are permanent | schema |
| **B5** | **`certifiedBy` is free text with 261 spellings** for ~30 certifiers → expiry logic and the kashrut filter are unfixable until normalized | measured |
| **B6** | **847 food records (38.3%) carry `kosherAuthorityGroup: "unknown"`** — the field the filter reads — and the validator counts them as *having* kashrut (reports 20) | measured |
| **B7** | **302 records unreachable by any category filter**, including the two best-curated categories in the dataset | §4.1 |

### Can safely be improved later

| # | Finding |
|---|---|
| L1 | 247 ms blocking index build at module load — real, but a delivery optimization, not a foundation error |
| L2 | 5 MB dataset inlined into the JS bundle; code and data share a cache key |
| L3 | `cities` has no סמל ישוב, coordinates or type (blocks the regional-council outlier work, blocks nothing else) |
| L4 | 976 records with a 20-key `extra` shadow schema, incl. 461 typed mikveh attributes |
| L5 | `lastVerifiedAt` is a literal at 150+ authoring sites; nothing computes it at runtime |
| L6 | Stale generated files still on disk (`synagogues.osm.json` 1,590 · `restaurants.osm.json` 1,337 · three empty `*.chains.json`) — the inputs `import:all` would rebuild from |
| L7 | `fast_food` is both a `PlaceType` and a `PlaceSubType` |
| L8 | ~~Tzohar PDF cache never invalidates~~ **Addressed 2026-08-24.** `extract-cert-expiry.mjs` now re-fetches when a cert is expired/within 60 days of expiry or has no fetch-metadata record (`--window` to tune, `--refresh` to force); a failed or dateless re-fetch never touches the existing `certificateValidUntil` — an already-expired record stays expired rather than being silently extended. First live re-check of all 180 Tzohar certs (dry run, 0 failures): 0 new 5787/תשפ״ז renewals published yet, 164 unchanged, 16 wineries (vintage-year certs, no expiry date by design), same 12 still expired |
| L9 | 4,011 records (53.7%) have no retrievable URL — the irreducible verification ceiling |
| L10 | `submitReport` discards user reports to `console.log` |

**The distinction that matters:** B1–B7 are all schema-and-process problems that get *more expensive per record added*. L1–L10 are implementation problems whose cost is flat. That is the actual answer to your central question — **yes, continuing to build features on the current data foundation compounds cost, but only through B1–B7.** Fixing those is roughly two weeks of mostly-mechanical work, and it does not require the delivery rework.

---

## 11. Migration path

Ordered so each phase makes the next cheaper. Phases 0–2 are the blockers; 3+ can run alongside feature work.

**Phase 0 — Stop the bleeding.** ~1 day.
Delete or hard-gate `import:all`/`import:restaurants` (B2). Resolve the 12 expired certificates — a human call per business: renewed / lapsed / closed (B1). Wire `cert-expiry --strict` into `npm run verify`. **First, because every later phase adds value `import:all` would erase.**

**Phase 1 — Re-run the partition, close the 29% gap.** ~3 days.
Phase 17A/B already proved 0 orphans and exact parity on 4,932 records. Re-run it against 7,471: 5,315 (71.1%) map immediately; the 2,156 food records need a food-source taxonomy (chain → `chain:<slug>`, tzohar → `tzohar:certificates`, manual → `manual:<batch>`). **2,104 of them already carry an origin field** — this is a mapping script, not research. Only 52 need a human answer. *Gate: 0 orphans, parity exact at 7,471.*

**Phase 2 — Schema v2 + guards.** ~1 week.
`status`, `provenance` contract, `certifierId` vocabulary (agent proposes the 261→~30 mapping; **a human approves it once** — conflating two certifiers is a religious error, not a data error), typed attribute blocks replacing `extra`, the seven new ratchets, displacement guard, volume guard, sanctioned-writer rule.

**Phase 3 — Catalog restructure.** ~3 days.
`kind`/`subkind` split aligned to `kosherbusiness.business_type`; generate filter UI from the catalog; the 302 stranded records become reachable. Ship `mikveh` attributes out of `extra` — 461 records gain real accessibility filtering for free.

**Phase 4 — Cities as a real dimension.** ~3 days.
CBS `citiesandsettelments` → `cityRef` by סמל ישוב. **Before coordinate work**: several current outliers are `cityId` errors, not coordinate errors, and fixing the coordinate there would corrupt the correct field.

**Phase 5 — Adopt the adapters, refresh the solved upstreams.** ~2 weeks.
Chabad 139 → ~360 (one API call, after correcting the wrong ToS note in `sources.ts`); mikveh attributes from `mikve`; ArcGIS re-runs including the **unused Jerusalem municipal layer** — the largest synagogue city in the dataset, behind an API the project already has a working adapter for. Add Be'er Sheva `synagogues-br7` (270 rows with WGS84 coordinates vs the 149 currently held).

**Phase 6 — Delivery split.** ~1 week. *Independent of everything above; schedule against the UI work, not the data work.*
Three artifacts + `meta.json`; pre-built search index; background version check. This is where the 247 ms startup cost and the shared code/data cache key get fixed.

**Phase 7 — Kashrut evidence. Permanent, human-owned.**
Three-tier evidence display; consume the Tzohar **de-supervision** list; quarterly `kosherbusiness` poll. **No upstream makes this cheap. Budget it as ongoing work, not a project.**

---

## 12. The answer to the central question

You asked what the end-to-end architecture should be so the data stays reliable, maintainable, cost-efficient, resilient and extensible across Web, iOS and Android.

**The architecture is the one already designed in `importers/unified/`, finished and adopted** — source registry → adapters → staging → normalize → validate → canonical per-source files → one deterministic merge → content-hashed serving artifacts. It was proven to exact parity and then abandoned at 71% coverage while the dataset grew through the old path.

**The three things that design is missing**, all learnt from this project's own incidents: a per-batch displacement guard (the 111 km move was in the existing guard's blind spot), a volume guard (so a broken parser looks like a broken parser, not a deletion), and a `status` field (so additive-only stops meaning "stale forever").

**The delivery answer is smaller than expected.** 340 KB brotli for the entire country means no delta sync, no backend, no client-specific model. Split the artifact by access pattern, pre-build the search index, give data its own cache key. That is the whole client story for all three platforms.

**The thing no architecture fixes:** there is no upstream for kashrut. `kosherbusiness` is 63 rows and one council, 5 months overdue. 30% of the records carry ~100% of the maintenance burden and all of the religious risk, and that will still be true after every phase above is complete. The correct response is not to keep searching for a source — it is to **spend the architecture on making that human work cheap, auditable and safe**: controlled certifier vocabulary, honest expiry, evidence tiers, and a validator that fails loudly when a certificate lapses.

Everything else — synagogues, mikvehs, Chabad, coordinates, cities — can be bought cheaply from upstreams that already exist and already have working adapters in this repo.

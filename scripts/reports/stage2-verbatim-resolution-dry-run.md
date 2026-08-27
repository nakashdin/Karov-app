# Stage 2 dry run — resolving verbatimText records via the registry

**Date:** 2026-08-27
**Mode:** read-only, no writes made or queued. No `--apply` exists in the script that produced this.

## Predicate

Population: places in `src/data/generated/places.osm.json` ONLY (restaurants.osm.json
excluded — see below) for which `classifyKosherState` (src/utils/kosher.ts:181-246)
would return `{ body: { kind: 'verbatimText', ... } }` today. Concretely: `certifierId`
absent, no `kosherAuthorityGroup`/`kosherLevel`/`kosherAuthority` match any earlier
branch, no `kosherType`, but `certifiedBy` is set.

Of that population, this reports which records' `certifiedBy` text resolves to a
registered authority (`authorityId != null`) via `authority-normalize.mjs`'s
`resolveAuthorityFromText` — the same fuzzy resolver `kashrut-pipeline.mjs` uses.
Registry resolution only; no fuzzy inference beyond what that resolver already does;
`certifiedBy` text is never proposed to be rewritten.

## Why places.osm.json only

`restaurants.osm.json` has 953 ids overlapping `places.osm.json`, 900 of which diverge
on kashrut fields — `restaurants.osm.json` is a write target with no `src/` readers
(only `OsmPlacesRepository.ts` → `places.osm.json` + `cities.osm.json` is imported by
the app). Counting `restaurants.osm.json` inflates this population with stale
pre-remediation duplicates of records already fixed in `places.osm.json`, the file the
app actually serves. An earlier run of this same predicate across both files produced
population 165 / resolved 102 — purely an artifact of that duplication, not a real
difference in scope. This is itself a separate, escalated finding (not resolved here):
`restaurants.osm.json`'s drift and disuse, and whether to sync, freeze, or retire it,
is a data-integrity decision for the owner.

## Result

```
population (verbatimText, has certifiedBy) : 67
resolves to a registered authority         : 26
does not resolve (generic or unlisted)     : 41
```

kosherAuthorityGroup breakdown of the 26: `{"rabbinate": 25, "badatz": 1}`

## Resolved (26) — proposed for certifierId + kosherAuthorityGroup write

| id | certifiedBy (verbatim, untouched) | → authorityId |
|---|---|---|
| 9000111 | בד"ץ העדה החרדית | badatz-edah-hachareidis |
| 9000112 | רבנות נתניה | rabbinate-netanya |
| manual-winery-mond | הרבנות הראשית לישראל | rabbinate-chief-israel |
| manual-winery-tishbi | רבנות זכרון יעקב | rabbinate-zichron-yaakov |
| manual-4teamim-tlv-yehuda-halevi | רבנות תל אביב | rabbinate-tel-aviv |
| manual-4teamim-tlv-ibn-gavirol | רבנות תל אביב | rabbinate-tel-aviv |
| manual-4teamim-tlv-karlbach | רבנות תל אביב | rabbinate-tel-aviv |
| manual-falafel-shoshana-ramat-eliyahu | רבנות ראשון לציון | rabbinate-rishon-lezion |
| manual-falafel-shoshana-rothschild | רבנות ראשון לציון | rabbinate-rishon-lezion |
| manual-falafel-shoshana-hadracha | רבנות ראשון לציון | rabbinate-rishon-lezion |
| manual-shnitzel-point-tlv-yad-harutzim | רבנות תל אביב | rabbinate-tel-aviv |
| manual-shnitzel-point-tlv-ibn-gavirol | רבנות תל אביב | rabbinate-tel-aviv |
| manual-schnitzelein-tlv | רבנות תל אביב | rabbinate-tel-aviv |
| manual-sushi-rehavia-rehavia | רבנות ירושלים | rabbinate-jerusalem |
| manual-sushi-rehavia-emek-refaim | רבנות ירושלים | rabbinate-jerusalem |
| manual-sushi-rehavia-city-center | רבנות ירושלים | rabbinate-jerusalem |
| manual-sushi-rehavia-rachel-imenu | רבנות ירושלים | rabbinate-jerusalem |
| manual-sai-sushi-ramat-gan | רבנות רמת גן | rabbinate-ramat-gan |
| manual-hashamen-mahane-yehuda | רבנות ירושלים | rabbinate-jerusalem |
| manual-hashamen-jrm-katamon | רבנות ירושלים | rabbinate-jerusalem |
| manual-hashamen-jrm-beit-hakerem | רבנות ירושלים | rabbinate-jerusalem |
| manual-yaakov-kabab-bat-galim | רבנות חיפה | rabbinate-haifa |
| manual-yaakov-kabab-haifa-center | רבנות חיפה | rabbinate-haifa |
| manual-vivino-pt | רבנות פ"ת | rabbinate-petah-tikva |
| manual-max-brenner-pt | רבנות פ"ת | rabbinate-petah-tikva |
| manual-bleecker-namal-tlv | רבנות תל אביב | rabbinate-tel-aviv |

None of these 26 resolve via a `מועצה דתית → רבנות` alias (the Reviewer's separately
escalated finding) — checked directly: no `certifiedBy` string in the 67-record
population contains "מועצה דתית". The one "מועצה" occurrence in the population
(`manual-winery-kitron`: "מועצה אזורית עמק יזרעאל", a regional council) is in the
unresolved 41 and is a different institution type, uninvolved in that finding.

## Unresolved (41) — must stay untouched

Generic terms with no specific body named (`כשר`, `רבנות`, `רבנות מקומית`, `כשרות
מקומית`), one regional-council mention, and two `בד"ץ יורה דעה` records naming a body
not in the registry's alias table. Full list: see script output; ids are
`9000108`, `9000110`, `manual-winery-{kitron,recanati,har-odem,yatir,kishor,rimon,
adir,ramat-negev,ramot-naftaly}`, `manual-4teamim-{nes-tziona,raanana,givatayim}`,
`manual-falafel-{zion-yehud,kaduri-hod-1,kaduri-hod-2}`,
`manual-{schnitzelein-bb,shnitzels-raanana,mexicana-rishonim}`,
`manual-kampai-{beersheva,ashdod}`, `manual-transit-beer-yaakov`,
`manual-red-sun-{bilu-center,mazkeret-batya}`,
`manual-hashamen-{modiin-yishpro,modiin-azrieli,holon}`,
`manual-basrala-{haifa-castra,kiryat-haim,karmiel}`,
`manual-yaakov-kabab-{kiryat-haim,nesher}`, `manual-nagisa-afula`,
`manual-raffaello-{kiryat-bialik,netanya}`, `manual-dr-shakshuka-{jaffa,rishon}`,
`manual-bleecker-{ramat-gan,hadera}`, `manual-aroma-tlv-azrieli`.

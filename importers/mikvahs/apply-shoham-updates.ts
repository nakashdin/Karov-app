/**
 * Shoham updates write — owner-directed (user-provided, confirmed 2026-06-22):
 *   (1) ADD  new mikveh: מקווה גברים דורות אברהם, רחוב המכבים 94, שוהם
 *            (native coord reused from the co-located synagogue osm-node-4406510250).
 *   (2) EDIT existing mikveh-557 (מקווה נשים חרמון): rename → "מקווה טהרה לנשים",
 *            set full openingHours, refresh lastVerifiedAt. Address/phone/location
 *            unchanged. This is the ONLY existing record touched.
 *
 * BACKUP first; verify EXACT reconciliation (+1 place, +1 mikveh, exactly 1
 * existing record modified = mikveh-557 with only the intended fields, 0 deleted,
 * 0 id collisions); recompute cities additively; restore on any failure.
 * NEVER rebuildAppDataset. No publish here (deploy is a separate explicit step).
 *
 * Run:  node importers/mikvahs/apply-shoham-updates.ts
 */
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael, isMain } from '../shared/utils.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const OUT = join(HERE, 'output');
const PLACES = join(GEN, 'places.osm.json');
const CITIES = join(GEN, 'cities.osm.json');
const PLACES_BAK = join(GEN, 'places.osm.pre-shoham-updates.backup.json');
const CITIES_BAK = join(GEN, 'cities.osm.pre-shoham-updates.backup.json');
const REPORT = join(OUT, 'shoham-updates-apply-result.json');
// BOM-safe: strip a leading BOM on read; preserve each file's original BOM state on write.
const hasBom = (p: string): boolean => readFileSync(p, 'utf8').charCodeAt(0) === 0xFEFF;
const read = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8').replace(/^﻿/, '')) as T;
const write = (p: string, d: unknown, bom: boolean): void => writeFileSync(p, (bom ? '﻿' : '') + JSON.stringify(d, null, 2), 'utf8');
const NOW = new Date().toISOString().slice(0, 10);

const ANCHOR_ID = 'osm-node-4406510250'; // דורות אברהם synagogue, המכבים 94, שוהם
const HERMON_ID = 'mikveh-557';

function run(): void {
  const placesBom = hasBom(PLACES);
  const citiesBom = hasBom(CITIES);
  const before = read<Place[]>(PLACES);
  const citiesBefore = read<{ id: string; name: string }[]>(CITIES);
  const beforeById = new Map(before.map((p) => [p.id, p]));

  const anchor = beforeById.get(ANCHOR_ID) as any;
  if (!anchor?.location) throw new Error(`anchor ${ANCHOR_ID} not found — STOP`);
  const hermon = beforeById.get(HERMON_ID) as any;
  if (!hermon) throw new Error(`${HERMON_ID} not found — STOP`);

  const loc = { latitude: anchor.location.latitude, longitude: anchor.location.longitude };
  const newId = `mikveh-shoham-m-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`;

  // (1) NEW record
  const newRec: Place = {
    id: newId, name: 'מקווה גברים דורות אברהם', type: 'mikveh', cityId: 'שוהם',
    address: 'רחוב המכבים 94, שוהם', location: loc, source: 'seed',
    phone: '039723060',
    openingHours: "א'-ה': מעלות השחר עד 12:00; שישי: מעלות השחר עד כניסת שבת; שבת וחג: מעלות השחר עד 11:00; מועדים וחגים: יש לפנות ליוסי מנזון",
    mikvehGender: 'גברים', attendant: 'יוסי מנזון (רכז שירותי דת) 054-7784823',
    sourceName: 'מועצה מקומית שוהם — שירותי דת',
    extra: {
      license: 'owner-provided', coordSource: `record-native(co-located synagogue ${ANCHOR_ID})`, hasKelim: true,
      contacts: { maintenance: 'יוסי מנזון 054-7784823', halacha: 'הרב רן כלילי 052-7974910', moked: '03-9723060', whatsapp: '053-4230106' },
      notice: 'לפני טבילה חובה להתקלח במים ובסבון',
      provenance: { sourceId: 'user-provided:shoham:dorot-avraham', fetchedAt: NOW },
    },
  };

  // (2) EDIT mikveh-557 — only name, openingHours, lastVerifiedAt change.
  const hermonUpdated = {
    ...hermon,
    name: 'מקווה טהרה לנשים',
    openingHours: "א'-ה': 19:30–22:00 (קיץ) / 18:30–21:00 (חורף); שישי וערב חג: חצי שעה לאחר הדלקת הנרות למשך כשעה; מוצ\"ש וחג: שעה אחרי צאת שבת/חג למשך שעתיים (משתנה לפי זמני השקיעה)",
    lastVerifiedAt: NOW,
  };

  // --- PRE-WRITE GATES ---
  if (beforeById.has(newId)) throw new Error(`new id ${newId} already exists — STOP`);
  if (newRec.type !== 'mikveh' || !isInIsrael(newRec.location)) throw new Error('invalid new record — STOP');
  const HERMON_ALLOWED = new Set(['name', 'openingHours', 'lastVerifiedAt']);
  const hermonDiffKeys = [...new Set([...Object.keys(hermon), ...Object.keys(hermonUpdated)])].filter((k) => JSON.stringify((hermon as any)[k]) !== JSON.stringify((hermonUpdated as any)[k]));
  if (hermonDiffKeys.some((k) => !HERMON_ALLOWED.has(k))) throw new Error(`mikveh-557 would change unexpected fields: ${hermonDiffKeys} — STOP`);
  const mikvehBefore = before.filter((p) => p.type === 'mikveh').length;

  copyFileSync(PLACES, PLACES_BAK);
  copyFileSync(CITIES, CITIES_BAK);
  try {
    const after: Place[] = [...before.map((p) => (p.id === HERMON_ID ? hermonUpdated : p)), newRec];
    const counts: Record<string, number> = {};
    for (const p of after) if (p.cityId) counts[p.cityId] = (counts[p.cityId] ?? 0) + 1;
    const cities = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).map((name) => ({ id: name, name }));
    write(PLACES, after, placesBom);
    write(CITIES, cities, citiesBom);

    // --- VERIFY ---
    const verify = read<Place[]>(PLACES);
    if (hasBom(PLACES) !== placesBom || hasBom(CITIES) !== citiesBom) throw new Error('BOM state changed — STOP');
    const verById = new Map(verify.map((p) => [p.id, p]));
    const errs: string[] = [];
    if (verify.length !== before.length + 1) errs.push(`count ${before.length}+1 != ${verify.length}`);
    if (!verById.has(newId)) errs.push('new record missing');
    const lost = [...beforeById.keys()].filter((id) => !verById.has(id));
    if (lost.length) errs.push(`LOST ${lost.length} ids`);
    let modified: string[] = [];
    for (const p of before) if (JSON.stringify(verById.get(p.id)) !== JSON.stringify(p)) modified.push(p.id);
    if (modified.length !== 1 || modified[0] !== HERMON_ID) errs.push(`expected only ${HERMON_ID} modified, got [${modified}]`);
    const mikvehAfter = verify.filter((p) => p.type === 'mikveh').length;
    if (mikvehAfter !== mikvehBefore + 1) errs.push(`mikveh ${mikvehBefore}+1 != ${mikvehAfter}`);
    const citySet = new Set(cities.map((c) => c.id));
    const citiesLost = citiesBefore.filter((c) => !citySet.has(c.id)).map((c) => c.id);
    if (citiesLost.length) errs.push(`cities LOST ${citiesLost}`);
    if (errs.length) throw new Error('VERIFY FAILED:\n - ' + errs.join('\n - '));

    const result = {
      status: 'SUCCESS',
      scope: 'Shoham: +1 new mikveh (דורות אברהם, men, with keilim area) and edit of mikveh-557 (rename→"מקווה טהרה לנשים", full hours). Additive + single owner-directed edit. No rebuild, no publish.',
      backups: { places: PLACES_BAK, cities: CITIES_BAK },
      added: { id: newId, name: newRec.name, city: 'שוהם' },
      edited: { id: HERMON_ID, changedFields: hermonDiffKeys, name: { from: hermon.name, to: hermonUpdated.name } },
      counts: { placesBefore: before.length, placesAfter: verify.length, mikvehBefore, mikvehAfter, deleted: lost.length, existingModified: modified.length, idCollisions: 0 },
      reconciliation: `EXACT: places ${before.length}→${verify.length} (+1); mikveh ${mikvehBefore}→${mikvehAfter} (+1); 0 deleted; exactly 1 existing edited (${HERMON_ID}, fields: ${hermonDiffKeys}); ${citiesBefore.length}→${cities.length} cities.`,
      rollback: [`copy "${PLACES_BAK}" → places.osm.json`, `copy "${CITIES_BAK}" → cities.osm.json`, 'do NOT rebuildAppDataset'],
      dryRun: false, additiveOnly: false, ownerDirectedEdit: true, rebuildRun: false, publishPerformed: false,
    };
    write(REPORT, result, false);
    console.log('=== Shoham updates — SUCCESS ===');
    console.log(`ADDED ${newId} (${newRec.name})`);
    console.log(`EDITED ${HERMON_ID}: fields [${hermonDiffKeys}] — "${hermon.name}" → "${hermonUpdated.name}"`);
    console.log(`places ${before.length}→${verify.length} | mikveh ${mikvehBefore}→${mikvehAfter} | deleted ${lost.length} | modified ${modified.length}`);
    console.log(`backups: ${PLACES_BAK} , ${CITIES_BAK}`);
  } catch (e) {
    copyFileSync(PLACES_BAK, PLACES);
    copyFileSync(CITIES_BAK, CITIES);
    console.error('WRITE FAILED — restored from backup.');
    throw e;
  }
}

if (isMain(import.meta.url)) run();

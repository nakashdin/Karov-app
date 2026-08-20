/**
 * Phase 25 — Shoham / "דורות אברהם" men's mikveh (DRY-RUN, additive).
 *
 * SOURCE: user-provided (owner-supplied operational details), corroborated
 * against the live dataset and public records:
 *   - "דורות אברהם, רחוב המכבים 94" already exists in the dataset as a SYNAGOGUE
 *     in שוהם (osm-node-4406510250) with native OSM coords → same building.
 *   - The supplied moked number 03-9723060 resolves to מועצה מקומית שוהם.
 *   - שוהם currently has 2 women's mikvehs live and NO men's mikveh.
 * → The record belongs to שוהם (the Google screenshot was a Modiin search, but
 *   every supplied detail is Shoham). CONFIRM CITY BEFORE WRITING.
 *
 * Coordinates: NATIVE (reused from the co-located דורות אברהם synagogue record).
 * Gender-aware dedup vs the live 696. NO write, NO publish, NO rebuild.
 *
 * Run:  node importers/mikvahs/phase25-shoham-import.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isInIsrael, isMain } from '../shared/utils.ts';
import type { GeoPoint } from '../unified/schema/normalized-record.ts';
import type { Place } from '../../src/types/place.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const GEN = join(HERE, '..', '..', 'src', 'data', 'generated');
const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const NOW = new Date().toISOString().slice(0, 10);

const CITY = 'שוהם';
const SLUG = 'shoham';
const ANCHOR_ID = 'osm-node-4406510250'; // דורות אברהם synagogue, רחוב המכבים 94, שוהם

const genderOf = (name: unknown, mg: unknown): string => { const s = `${mg ?? ''} ${name ?? ''}`; if (/כלים/.test(s)) return 'כלים'; if (/גברים/.test(s)) return 'גברים'; return 'נשים'; };
const meters = (a: GeoPoint, b: GeoPoint): number => { const R = (d: number) => (d * Math.PI) / 180; const dLat = R(b.latitude - a.latitude), dLng = R(b.longitude - a.longitude); const hh = Math.sin(dLat / 2) ** 2 + Math.cos(R(a.latitude)) * Math.cos(R(b.latitude)) * Math.sin(dLng / 2) ** 2; return 2 * 6371000 * Math.asin(Math.sqrt(hh)); };

function run(): void {
  const all = readJson<any[]>(join(GEN, 'places.osm.json'));
  const live = all.filter((p: any) => p.type === 'mikveh');
  const existingIds = new Set(all.map((p) => p.id));
  const anchor = all.find((p) => p.id === ANCHOR_ID);
  if (!anchor?.location) throw new Error(`anchor record ${ANCHOR_ID} (דורות אברהם) not found — STOP`);
  const loc: GeoPoint = { latitude: anchor.location.latitude, longitude: anchor.location.longitude };

  const rec = {
    name: 'מקווה גברים דורות אברהם',
    address: 'רחוב המכבים 94, שוהם',
    gender: 'גברים',
    hours: "א'-ה': מעלות השחר עד 12:00; שישי: מעלות השחר עד כניסת שבת; שבת וחג: מעלות השחר עד 11:00; מועדים וחגים: יש לפנות ליוסי מנזון",
    phone: '039723060',
    attendant: 'יוסי מנזון (רכז שירותי דת) 054-7784823',
    contacts: {
      maintenance: 'יוסי מנזון (רכז שירותי דת) 054-7784823',
      halacha: 'הרב רן כלילי 052-7974910',
      moked: '03-9723060',
      whatsapp: '053-4230106',
    },
    notice: 'לפני טבילה חובה להתקלח במים ובסבון',
    hasKelim: true, // אזור לטבילת כלים קיים במקווה
  };

  // --- UPDATE to an existing record: מקווה נשים חרמון (mikveh-557) ---
  const HERMON_ID = 'mikveh-557';
  const hermonBefore = all.find((p) => p.id === HERMON_ID);
  const hermonUpdate = hermonBefore ? {
    id: HERMON_ID,
    changes: {
      name: { from: hermonBefore.name, to: 'מקווה טהרה לנשים' },
      address: { from: hermonBefore.address, to: "רח' חרמון 6, שהם" },
      openingHours: {
        from: hermonBefore.openingHours ?? null,
        to: "א'-ה': 19:30–22:00 (קיץ) / 18:30–21:00 (חורף); שישי וערב חג: חצי שעה לאחר הדלקת הנרות למשך כשעה; מוצ\"ש וחג: שעה אחרי צאת שבת/חג למשך שעתיים (משתנה לפי זמני השקיעה)",
      },
    },
    unchanged: { phone: hermonBefore.phone, location: hermonBefore.location, keilim: (hermonBefore.extra as any)?.forDishes },
    note: 'MODIFIES an existing record (name/address/hours). Phone already matches (03-9791460). Keilim already noted (extra.forDishes="כן"). Requires explicit approval — this is NOT additive-only.',
  } : null;

  // --- dedup vs live (gender-aware) ---
  const g = genderOf(rec.name, rec.gender);
  const nearLive = live.filter((l) => l.location).find((l) => genderOf(l.name, l.mikvehGender) === g && meters(loc, l.location) <= 150);
  const sameCityName = live.find((l) => l.cityId === CITY && genderOf(l.name, l.mikvehGender) === g && /דורות אברהם/.test(l.name ?? ''));
  const disposition = nearLive ? 'duplicate' : sameCityName ? 'duplicate' : 'write_ready';
  const reason = nearLive ? `geo-duplicate of live ${nearLive.id} (${Math.round(meters(loc, nearLive.location))}m, same gender)`
    : sameCityName ? `name duplicate of live ${sameCityName.id}`
    : 'native coordinate (co-located דורות אברהם synagogue), no men\'s mikveh in שוהם — not a duplicate';

  const analysis = [{
    name: rec.name, address: rec.address, gender: rec.gender, city: CITY,
    coordSource: `record-native(reused from co-located synagogue ${ANCHOR_ID})`,
    location: loc, disposition, reason,
    matchedLiveId: nearLive?.id ?? sameCityName?.id ?? null,
    cityDisambiguation: 'Supplied under a "מקווה מודיעין" search, but address+name match the שוהם synagogue exactly and the supplied moked 03-9723060 is מועצה מקומית שוהם → assigned to שוהם. CONFIRM BEFORE WRITE.',
    liveShohamMikvehs: live.filter((l) => l.cityId === CITY).map((l) => `${l.name} (${genderOf(l.name, l.mikvehGender)})`),
  }];

  const writeReady: Place[] = disposition !== 'write_ready' ? [] : [(() => {
    const place: Place = {
      id: `mikveh-${SLUG}-m-${loc.latitude.toFixed(5)}_${loc.longitude.toFixed(5)}`,
      name: rec.name, type: 'mikveh', cityId: CITY, address: rec.address,
      location: loc, source: 'seed',
      phone: rec.phone, openingHours: rec.hours, mikvehGender: rec.gender, attendant: rec.attendant,
      sourceName: 'מועצה מקומית שוהם — שירותי דת',
    };
    place.extra = {
      license: 'owner-provided',
      coordSource: `record-native(co-located synagogue ${ANCHOR_ID})`,
      contacts: rec.contacts,
      notice: rec.notice,
      hasKelim: true,
      provenance: { sourceId: 'user-provided:shoham:dorot-avraham', fetchedAt: NOW },
    };
    return place;
  })()];

  const collisions = writeReady.filter((p) => existingIds.has(p.id)).map((p) => p.id);

  const summary = {
    generatedNote: 'PHASE 25 DRY-RUN — Shoham "דורות אברהם" men\'s mikveh (user-provided). Native coordinate reused from the co-located synagogue record. No write, no publish, no rebuild.',
    cityDisambiguation: {
      suppliedContext: 'Google search screenshot was "מקווה מודיעין"',
      evidenceForShoham: [
        'דורות אברהם + רחוב המכבים 94 already exists in the dataset as a synagogue in שוהם (osm-node-4406510250)',
        'supplied moked 03-9723060 = מועצה מקומית שוהם',
        'שוהם has 2 women\'s mikvehs live and NO men\'s mikveh — matches "יש גם מקווה גברים"',
      ],
      resolution: 'assigned to שוהם — AWAITING USER CONFIRMATION before any write',
    },
    totalParsed: 1,
    duplicates: disposition === 'duplicate' ? 1 : 0,
    writeReady: writeReady.length,
    idCollisions: collisions.length,
    finalRecommendedWriteCount: collisions.length ? 0 : writeReady.length,
    liveMikvehBefore: live.length,
    estimatedTotalAfterWrite: live.length + (collisions.length ? 0 : writeReady.length),
    fieldsCaptured: ['name', 'address', 'location(native)', 'phone(moked)', 'openingHours', 'mikvehGender', 'attendant', 'extra.contacts (maintenance/halacha/moked/whatsapp)', 'extra.notice (חובה להתקלח לפני טבילה)'],
    rollbackPlan: ['Backup places.osm.json (+cities) before any write', 'Additive append only; do NOT run rebuildAppDataset'],
    dryRun: true, liveDataTouched: false, publishPerformed: false, rebuildTouched: false,
  };

  (summary as any).hermonUpdate = hermonUpdate;

  writeFileSync(join(OUT, 'phase25-shoham-preview.json'), JSON.stringify([rec], null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-shoham-merge-analysis.json'), JSON.stringify(analysis, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-shoham-write-ready-preview.json'), JSON.stringify(writeReady, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-shoham-hermon-update-preview.json'), JSON.stringify(hermonUpdate, null, 2), 'utf8');
  writeFileSync(join(OUT, 'phase25-shoham-summary.json'), JSON.stringify(summary, null, 2), 'utf8');

  console.log('=== Phase 25 — Shoham "דורות אברהם" men\'s mikveh + חרמון update (dry-run) ===');
  console.log(`anchor: ${ANCHOR_ID} @ ${loc.latitude.toFixed(6)},${loc.longitude.toFixed(6)}`);
  console.log(`NEW men's mikveh: disposition ${disposition} — write-ready ${writeReady.length} | id collisions ${collisions.length} (+ keilim area noted)`);
  console.log(`UPDATE חרמון (${HERMON_ID}): name "${hermonUpdate?.changes.name.from}" → "${hermonUpdate?.changes.name.to}"; hours "${hermonUpdate?.changes.openingHours.from}" → full; phone unchanged (${hermonUpdate?.unchanged.phone})`);
  console.log(`live Shoham mikvehs: ${analysis[0].liveShohamMikvehs.join(' | ') || 'none'}`);
  console.log(`live ${live.length} → est after write ${summary.estimatedTotalAfterWrite} (new) + 1 modified`);
}

if (isMain(import.meta.url)) run();

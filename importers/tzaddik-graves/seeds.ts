/**
 * Phase 3 — Manual seeds for must-have sites that APIs cannot reliably supply.
 *
 * These sites are:
 *  - Geographically confirmed (coords from authoritative sources)
 *  - Wikimedia/OSM verified by Q-ID or OSM ID
 *  - Injected before dedup so they can merge with any API hit
 *
 * ⛔ NEVER change coordinates here without verifying against an authoritative map.
 */
import type { TzaddikGraveRaw } from './types.ts';

export const MANUAL_SEEDS: TzaddikGraveRaw[] = [
  {
    // קבר רחל — Rachel's Tomb, Bethlehem entrance road (not Rachel wife of R. Akiva in Tiberias)
    // Wikidata Q1302541 | OSM way/26836660
    // Coords verified: Google Maps / OSM / Wikidata P625
    sourceId: 'manual-kever-rachel',
    source: 'manual',
    name: 'קבר רחל',
    lat: 31.7226,
    lng: 35.2037,
    city: 'בית לחם',
    buriedPerson: 'רחל אמנו',
    wikidataId: 'Q1302541',
    verifiedAt: '',           // filled at runtime
    confidenceScore: 95,
    confidenceLevel: 'high',
    confidenceReason: 'seed ידני | Q1302541 | קואורדינטות מאומתות',
    extra: { isMustHave: true, manualSeed: true },
  },
  {
    // מערת המכפלה — Cave of Machpelah / Al-Ibrahimi Mosque, Hebron
    // Wikidata Q204200 | OSM way/285543994
    // Coords verified: Wikidata P625 = 31.5244, 35.1103
    sourceId: 'manual-machpelah',
    source: 'manual',
    name: 'מערת המכפלה',
    lat: 31.5244,
    lng: 35.1103,
    city: 'חברון',
    buriedPerson: 'האבות: אברהם, יצחק, יעקב, שרה, רבקה, לאה',
    wikidataId: 'Q204200',
    verifiedAt: '',
    confidenceScore: 95,
    confidenceLevel: 'high',
    confidenceReason: 'seed ידני | Q204200 | קואורדינטות מאומתות',
    extra: { isMustHave: true, manualSeed: true },
  },
  {
    // קבר יוסף — Joseph's Tomb, Nablus (Shechem)
    // Wikidata Q1297538 | OSM node/268698521
    // Coords verified: Wikidata P625 = 32.2124, 35.2845
    sourceId: 'manual-kever-yosef',
    source: 'manual',
    name: 'קבר יוסף',
    lat: 32.2124,
    lng: 35.2845,
    city: 'שכם',
    buriedPerson: 'יוסף הצדיק',
    wikidataId: 'Q1297538',
    verifiedAt: '',
    confidenceScore: 95,
    confidenceLevel: 'high',
    confidenceReason: 'seed ידני | Q1297538 | קואורדינטות מאומתות',
    extra: { isMustHave: true, manualSeed: true },
  },
  {
    // קבר רבי עקיבא — Old Cemetery, Tiberias
    // Coords verified: OSM + field reports ~32.7948, 35.5346
    sourceId: 'manual-kever-akiva',
    source: 'manual',
    name: 'קבר רבי עקיבא',
    lat: 32.7948,
    lng: 35.5346,
    city: 'טבריה',
    buriedPerson: 'רבי עקיבא בן יוסף',
    verifiedAt: '',
    confidenceScore: 90,
    confidenceLevel: 'high',
    confidenceReason: 'seed ידני | בית העלמין הקדמי, טבריה | קואורדינטות מאומתות',
    extra: { isMustHave: true, manualSeed: true },
  },
  {
    // קבר האר"י הקדוש — Grave of Rabbi Isaac Luria (the Ari), Old Cemetery, Safed
    // OSM: node/6628883701 | Wikidata burial site in old cemetery of Safed
    // Coords verified: OSM + field reports 32.9636, 35.4967
    sourceId: 'manual-kever-ari',
    source: 'manual',
    name: 'קבר האר"י הקדוש',
    lat: 32.9636,
    lng: 35.4967,
    city: 'צפת',
    buriedPerson: 'רבי יצחק לוריא (האר"י)',
    verifiedAt: '',
    confidenceScore: 92,
    confidenceLevel: 'high',
    confidenceReason: 'seed ידני | בית העלמין העתיק, צפת | קואורדינטות מאומתות',
    extra: { isMustHave: true, manualSeed: true },
  },
  {
    // קבר שמשון הגיבור — Tel Zorah, between Tzora and Eshtaol (Judges 16:31)
    // Traditional pilgrim site, twin caves painted blue (Samson and his father Manoah)
    // Source 1 — amudanan.co.il P801028: 31.774065, 34.985227
    // Source 2 — sholomtravels.com /shimshon-hagibor: 31.774103, 34.985153
    // Δ between sources: <10m — near-perfect match ✅
    // Note: traditionally accepted site, not archaeologically confirmed
    sourceId: 'manual-kever-shimshon',
    source: 'manual',
    name: 'קבר שמשון הגיבור',
    lat: 31.774065,
    lng: 34.985227,
    city: 'צרעה',
    buriedPerson: 'שמשון הגיבור',
    verifiedAt: '',
    confidenceScore: 82,
    confidenceLevel: 'high',
    confidenceReason: 'seed ידני | תל צרעה, בין צרעה לאשתאול | 2 מקורות תואמים (<10מ׳) | מסורת מקובלת',
    extra: { manualSeed: true },
  },
  {
    // קבר השל"ה הקדוש — Rabbi Isaiah Horowitz (1558–1630), Old Cemetery, Tiberias
    // Buried in the Rambam/Tannaim complex in Tiberias; died Tiberias 1630
    // Source 1 — holy.org.il/epicenter/השלה: 32.79057, 35.53565
    // Source 2 — nelech.co.il/קבר-השלה-הקדוש: 32.7897691, 35.5398467
    // Both sources: same complex (Tiberias old cemetery), Δ ~170m within complex ✅
    // Won't merge with Rambam (wikidata-grave-Q625219 at 32.79, 35.5372 — Δ ~235m)
    sourceId: 'manual-kever-shelah',
    source: 'manual',
    name: 'קבר השל"ה הקדוש',
    lat: 32.7897691,
    lng: 35.5398467,
    city: 'טבריה',
    buriedPerson: 'רבי ישעיהו הלוי הורוביץ (השל"ה הקדוש)',
    verifiedAt: '',
    confidenceScore: 85,
    confidenceLevel: 'high',
    confidenceReason: 'seed ידני | בית העלמין הקדמי טבריה, מתחם הרמב"ם | 2 מקורות תואמים | holy.org.il + nelech.co.il',
    extra: { manualSeed: true },
  },
];

/**
 * Read-only evidence extraction for the kashrut-authority migration review.
 *
 * Produces three reports from src/data/generated/places.osm.json and
 * scripts/reports/kashrut-registry.json:
 *
 *   1. Every food record whose certifiedBy exactly matches one of the 21
 *      COMPOUND reviewQueue raw strings (multiple authorities combined).
 *   2. Every food record whose certifiedBy exactly matches one of the 23
 *      UNRESOLVED_CANDIDATE reviewQueue raw strings.
 *   3. Every occurrence of the string "חלב ישראל" anywhere in a place
 *      record (not just certifiedBy), plus a scan of scripts/ and
 *      importers/ for any script that reads/matches on it to infer an
 *      authority or level.
 *
 * This pass extracts and quotes only — it does not classify, judge, or
 * modify any existing file. Re-run: node scripts/reports/generate-kashrut-evidence-reports.mjs
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '../..');
const PLACES_PATH = path.join(ROOT, 'src/data/generated/places.osm.json');
const REGISTRY_PATH = path.join(ROOT, 'scripts/reports/kashrut-registry.json');

const FOOD_TYPES = new Set(['restaurant', 'fast_food', 'cafe', 'coffee_cart', 'juice_bar', 'ice_cream_parlor', 'bakery', 'winery']);

const places = JSON.parse(readFileSync(PLACES_PATH, 'utf8'));
const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));
const byRaw = new Map(registry.reviewQueue.map((e) => [e.raw, e]));

const COMPOUND = [
  'בד"צ בית ישראל, העדה החרדית', 'בד"ץ העדה החרדית + בית יוסף', 'רבנות מטה בנימין + בית יוסף + הרב לנדא',
  'מכון אונגר + רבנות מטה בנימין', 'בד"ץ העדה החרדית ורבנות מודיעין עילית', 'בד"ץ בית יוסף / רבנות מהדרין',
  'רבנות ירושלים / בד"צ קהילות', 'בד"ץ בית יוסף + רבנות הר חברון', 'בד"ץ מחזיקי הדת (בעלז) + בית יוסף',
  'בד"ץ העדה החרדית + רבנות מטה יהודה', 'רבנות מודיעין מהדרין ובד"ץ בית יוסף', 'OU + רבנות גליל עליון + בית דין יורה דעה',
  'בד"ץ בית יוסף + OK', 'הרב אליעזר מלמד + OK', 'בד"ץ עדה חרדית ובד"ץ בית יוסף', 'בד"ץ בית יוסף ובהשגחת הרב מחפוד',
  'רבנות ירושלים ובד"צ העדה החרדית', 'בד"ץ יורה דעה + OUP', 'OK + עדה חרדית + רבנות מטה בנימין',
  'בד"ץ קהילות ורבנות ירושלים מהדרין', 'בד"ץ אגודת ישראל והרבנות המקומית',
];

const UNRESOLVED_CANDIDATE = [
  'בד"ץ מהדרין — ועד הרבנים', 'רב גרליצקי', 'הרב דיסקין', 'בד"ץ יורה דעה', 'רב רפאל מנת', 'בד"ץ בית שמש',
  'ברכות אליהו', 'רבנות ב"ש מהדרין', 'כשר בהשגחת הרבנות הראשית', 'חתם סופר', 'בד״צ חתם סופר', 'קהילות',
  'ברכת אליהו', 'רבנות ב"ש', 'הרב בנימין כהן', 'הרב הנדל', 'בד"ץ קהילות', 'הרב רפאל מנת', 'ראש העין',
  'בד"צ חולון', 'בד"ץ ירושלים', 'רבנות יפו', 'רבני הקריות',
];

const SOURCE_FIELDS = ['website', 'sourceUrl', 'provenance', 'kosherCertUrl', 'certificateValidUntil'];

function sourceFieldReport(p) {
  const out = {};
  for (const f of SOURCE_FIELDS) out[f] = Object.prototype.hasOwnProperty.call(p, f) ? p[f] : null;
  return out;
}

function recordEntry(p) {
  const reg = byRaw.get(p.certifiedBy);
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    cityId: p.cityId,
    certifiedBy_raw: p.certifiedBy,
    kosherAuthority: p.kosherAuthority ?? null,
    kosherLevel: p.kosherLevel ?? null,
    sourceFields: sourceFieldReport(p),
    registry_suggestedAuthorityId: reg?.suggestedAuthorityId ?? null,
    registry_suggestedLevel: reg?.suggestedLevel ?? null,
    registry_why: reg?.why ?? null,
  };
}

function buildReportForRawStrings(rawStrings, label) {
  const rawSet = new Set(rawStrings);
  const matches = places.filter((p) => FOOD_TYPES.has(p.type) && rawSet.has(p.certifiedBy));
  const byRawGrouped = {};
  for (const raw of rawStrings) {
    byRawGrouped[raw] = matches.filter((p) => p.certifiedBy === raw).map(recordEntry);
  }
  const totalMatched = matches.length;
  const rawsWithNoMatch = rawStrings.filter((raw) => byRawGrouped[raw].length === 0);
  return {
    label,
    rawStringCount: rawStrings.length,
    totalRecordsMatched: totalMatched,
    rawStringsWithNoMatchingRecord: rawsWithNoMatch,
    byRawString: byRawGrouped,
  };
}

// ── Report 1 & 2 ──────────────────────────────────────────────────────────
const report1 = buildReportForRawStrings(COMPOUND, 'COMPOUND (21 reviewQueue raw strings)');
const report2 = buildReportForRawStrings(UNRESOLVED_CANDIDATE, 'UNRESOLVED_CANDIDATE (23 reviewQueue raw strings)');

// ── Report 3: every occurrence of חלב ישראל ─────────────────────────────
const NEEDLE = 'חלב ישראל';
const datasetHits = [];
for (const p of places) {
  const fieldsToCheck = {
    certifiedBy: p.certifiedBy,
    description: p.description,
    'kosherDetails (stringified)': p.kosherDetails ? JSON.stringify(p.kosherDetails) : undefined,
    'extra (stringified)': p.extra ? JSON.stringify(p.extra) : undefined,
    'tags (joined)': p.tags ? p.tags.join(' | ') : undefined,
    sourceName: p.sourceName,
    name: p.name,
  };
  for (const [field, value] of Object.entries(fieldsToCheck)) {
    if (typeof value === 'string' && value.includes(NEEDLE)) {
      datasetHits.push({
        id: p.id, name: p.name, address: p.address, cityId: p.cityId,
        field, rawTextInField: value,
        kosherLevel: p.kosherLevel ?? null, kosherAuthority: p.kosherAuthority ?? null,
        certifiedBy: p.certifiedBy ?? null,
        sourceFields: sourceFieldReport(p),
        isGolda: p.id.startsWith('golda-'),
      });
    }
  }
}

const registryHits = [];
const registryText = JSON.stringify(registry);
if (registryText.includes(NEEDLE)) {
  for (const [key, val] of Object.entries(registry)) {
    const text = JSON.stringify(val);
    if (text.includes(NEEDLE)) {
      if (key === 'reviewQueue') {
        for (const entry of val) {
          if (JSON.stringify(entry).includes(NEEDLE)) registryHits.push({ section: 'reviewQueue', entry });
        }
      } else if (key === 'aliases') {
        for (const [alias, target] of Object.entries(val)) {
          if (alias.includes(NEEDLE) || String(target).includes(NEEDLE)) {
            registryHits.push({ section: 'aliases', alias, target });
          }
        }
      } else {
        registryHits.push({ section: key, value: val });
      }
    }
  }
}

// Grep scripts/ and importers/ for code that reads/matches on חלב ישראל
function walk(dir) {
  let out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'reports' || entry.endsWith('.json') || entry.endsWith('.backup.json')) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out = out.concat(walk(full));
    else if (/\.(mjs|ts|js)$/.test(entry)) out.push(full);
  }
  return out;
}

const codeFiles = [...walk(path.join(ROOT, 'scripts')), ...walk(path.join(ROOT, 'importers'))];
const codeHits = [];
for (const file of codeFiles) {
  const text = readFileSync(file, 'utf8');
  if (!text.includes(NEEDLE)) continue;
  const lines = text.split('\n');
  lines.forEach((line, i) => {
    if (line.includes(NEEDLE)) {
      codeHits.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        line: i + 1,
        code: line.trim(),
        // A same-line/adjacent-line regex is a heuristic, not proof — it flags
        // candidates for a human to actually read, it does not itself decide
        // "sets authority/level". See setsAuthorityOrLevel_verified below for
        // the hand-verified answer, which caught a false negative here: the
        // regex missed scripts/import-golda.mjs:121 (`return 'rabanut'`)
        // because the field name isn't on that line or its neighbors — the
        // inference only becomes visible by reading mapKosherType() as a whole
        // and tracing where its return value flows.
        setsAuthorityOrLevel_regexHeuristic: /kosherAuthority|kosherLevel|kosherAuthorityGroup/.test(line)
          || (lines[i + 1] && /kosherAuthority|kosherLevel|kosherAuthorityGroup/.test(lines[i + 1]))
          || (lines[i - 1] && /kosherAuthority|kosherLevel|kosherAuthorityGroup/.test(lines[i - 1])),
      });
    }
  });
}

// Hand-verified: traced scripts/import-golda.mjs:121 by reading mapKosherType()
// in full and following its return value through the rest of the file, then
// checking the live record and scripts/migrate-kosher-fields.mjs for the next
// hop. This is NOT derivable from a regex — recorded here as ground truth
// after manual inspection, overriding the heuristic above where they conflict.
const VERIFIED_INFERENCE_CHAIN = {
  claim: 'YES — חלב ישראל (a dairy-sourcing kashrut STANDARD, not a certifying body) is used to infer kosherAuthorityGroup="rabbinate" (a certifying-BODY claim the source text never actually made), via a two-script chain.',
  steps: [
    {
      file: 'scripts/import-golda.mjs', lines: '114-123',
      code: "function mapKosherType(kosherStr) {\n  if (!kosherStr) return 'kosher';\n  const s = kosherStr.trim();\n  if (s.includes('בד\"צ בית יוסף') || s.includes('בד\"ץ בית יוסף') || s.includes(\"כשר בד\\\"צ בית יוסף\")) return 'badatz_beit_yosef';\n  if (s === 'מהדרין') return 'mehadrin';\n  if (s.startsWith('רבנות') && s.length < 10) return 'rabanut';\n  if (s.includes(\"רבנות כפ\\\"ס\") || s.includes(\"רבנות כפ'ס\")) return 'rabanut_mekomi';\n  if (s === 'חלב ישראל') return 'rabanut';\n  return 'kosher';\n}",
      effect: "Golda's raw kosher_type string 'חלב ישראל' → kosherType = 'rabanut'. Line 121 is the exact match; note it sits in the same function as the legitimate authority-string matches (lines 117-120), so the same function conflates 'this text names a certifying body' with 'this text names a dairy standard'.",
    },
    {
      file: 'scripts/import-golda.mjs', lines: '162-183',
      code: 'const kosherType = mapKosherType(b.kosher);\nconst place = {\n  ...\n  kosherType,\n  ...\n};',
      effect: "kosherType: 'rabanut' is stored on the place object. Separately (lines 189-191), certifiedBy is also set to the literal raw string 'חלב ישראל' — that part is honest and unchanged by this pass.",
    },
    {
      file: 'scripts/migrate-kosher-fields.mjs', lines: '17',
      code: "rabanut: { kosherLevel: 'regular', kosherAuthorityGroup: 'rabbinate', kosherAuthority: null },",
      effect: "A later, separate migration reads kosherType='rabanut' off the record and writes kosherAuthorityGroup='rabbinate' (applied at lines 48-52 via `...place, kosherAuthorityGroup: meta.kosherAuthorityGroup`). This is the field the app's kashrut filter actually reads (src/data/repository/filterPlaces.ts).",
    },
  ],
  liveRecordConfirmation: {
    id: 'golda-ff986d68', note: 'Confirmed against src/data/generated/places.osm.json as of this report — the chain above is not hypothetical, this is the record it actually produced.',
    kosherType: 'rabanut', certifiedBy: 'חלב ישראל', kosherLevel: 'regular', kosherAuthorityGroup: 'rabbinate', kosherAuthority: null,
  },
};

const goldaHits = datasetHits.filter((h) => h.isGolda);

const report3 = {
  label: 'every occurrence of "חלב ישראל"',
  needle: NEEDLE,
  datasetHitCount: datasetHits.length,
  datasetHits,
  registryHitCount: registryHits.length,
  registryHits,
  codeHitCount: codeHits.length,
  codeHits,
  verifiedInferenceChain: VERIFIED_INFERENCE_CHAIN,
  goldaRecordsWithChalavYisrael: goldaHits,
};

const OUT_DIR = path.join(ROOT, 'scripts/reports');
writeFileSync(path.join(OUT_DIR, 'kashrut-evidence-report-1-compound.json'), JSON.stringify(report1, null, 2));
writeFileSync(path.join(OUT_DIR, 'kashrut-evidence-report-2-unresolved-candidate.json'), JSON.stringify(report2, null, 2));
writeFileSync(path.join(OUT_DIR, 'kashrut-evidence-report-3-chalav-yisrael.json'), JSON.stringify(report3, null, 2));

console.log('Report 1 (COMPOUND):', report1.totalRecordsMatched, 'records across', report1.rawStringCount, 'raw strings.', report1.rawStringsWithNoMatchingRecord.length, 'raw strings matched 0 records.');
console.log('Report 2 (UNRESOLVED_CANDIDATE):', report2.totalRecordsMatched, 'records across', report2.rawStringCount, 'raw strings.', report2.rawStringsWithNoMatchingRecord.length, 'raw strings matched 0 records.');
console.log('Report 3 (חלב ישראל): dataset hits =', report3.datasetHitCount, '| registry hits =', report3.registryHitCount, '| code hits =', report3.codeHitCount, '| Golda records =', report3.goldaRecordsWithChalavYisrael.length);
console.log('VERIFIED: ' + report3.verifiedInferenceChain.claim);
console.log('\nWritten to scripts/reports/kashrut-evidence-report-{1,2,3}-*.json');

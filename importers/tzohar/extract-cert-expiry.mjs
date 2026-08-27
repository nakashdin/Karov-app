/**
 * Download every Tzohar kashrut certificate PDF referenced by kosherCertUrl,
 * extract its text (the PDFs carry a real text layer over a scanned-looking
 * background), and pull out the supervision expiry date + kashrut attributes.
 *
 * The certificate wording is:
 *   "הפיקוח בתוקף עד לתאריך  <Hebrew date>  DD.MM.YY"
 *
 * Writes back to places.osm.json:
 *   certificateValidUntil : ISO date (YYYY-MM-DD)
 *   kosherDetails         : { shabbatClosed, bishulYisrael, chalavYisrael, ... }
 *
 * Refresh policy — the cache is NOT trusted forever. A cached PDF is only
 * reused as-is when the certificate it describes is still comfortably valid
 * (more than REFRESH_WINDOW_DAYS from its currently-known expiry) AND we
 * have fetch metadata proving it was actually downloaded (not just present
 * on disk from some earlier, possibly-interrupted run). Everything else —
 * already expired, approaching expiry, or never resolved to a date at all —
 * is re-fetched from the official source every run, because a locally cached
 * PDF cannot tell us whether Tzohar has since published a renewal.
 *
 * Failure handling is conservative on purpose: if a re-fetch fails, or the
 * fetched PDF has no parseable date, `certificateValidUntil` is left exactly
 * as it was. A failed refresh NEVER extends, clears, or guesses a new date —
 * an already-expired record stays expired until a real renewed certificate
 * is actually retrieved and parsed.
 *
 * Usage:
 *   node importers/tzohar/extract-cert-expiry.mjs [--limit N] [--dry]
 *                                                  [--refresh] [--window DAYS]
 *
 *   --dry       run retrieval + parsing but don't write places.osm.json
 *               (cert-cache/ is still updated — it's a local dev cache, not
 *               production data)
 *   --refresh   ignore cache freshness entirely; re-fetch every target
 *   --window N  re-fetch when within N days of the currently-known expiry
 *               (default 60, matching docs/DATA_ARCHITECTURE.md L8)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import zlib from 'zlib';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '../..');
const PLACES_PATH = path.join(ROOT, 'src/data/generated/places.osm.json');
const CACHE = path.join(__dir, 'cert-cache');

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const FORCE_REFRESH = args.includes('--refresh');
const LIMIT = args.includes('--limit') ? +args[args.indexOf('--limit') + 1] : Infinity;
const REFRESH_WINDOW_DAYS = args.includes('--window') ? +args[args.indexOf('--window') + 1] : 60;

if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });

const todayISO = new Date().toISOString().slice(0, 10);
const daysUntil = (iso) => Math.round((new Date(iso) - new Date(todayISO)) / 86400000);

/**
 * Whether the cached PDF for this place should be trusted as-is, or whether
 * the official source needs to be re-checked before we can say anything
 * about this certificate.
 */
function isCacheStale(id, currentValidUntil) {
  if (FORCE_REFRESH) return true;
  const metaPath = path.join(CACHE, id + '.meta.json');
  if (!existsSync(metaPath)) return true; // no fetch record — freshness unknown, don't trust it
  if (!currentValidUntil) return true;    // never resolved a date — always worth rechecking
  return daysUntil(currentValidUntil) <= REFRESH_WINDOW_DAYS; // expired (negative) or approaching
}

// ── PDF text extraction ──────────────────────────────────────────────────────
function inflateAll(s) {
  const out = [];
  let re = /stream\r?\n/g, m;
  while ((m = re.exec(s))) {
    const st = m.index + m[0].length, en = s.indexOf('endstream', st);
    if (en < 0) continue;
    try { out.push(zlib.inflateSync(Buffer.from(s.slice(st, en), 'latin1')).toString('latin1')); }
    catch { /* image / already-raw stream */ }
  }
  return out;
}

const hexToStr = h => {
  let s = '';
  for (let i = 0; i + 4 <= h.length; i += 4) s += String.fromCharCode(parseInt(h.substr(i, 4), 16));
  return s;
};

function buildCMap(chunks) {
  const map = new Map();
  for (const c of chunks) {
    if (!/beginbfchar|beginbfrange/.test(c)) continue;
    for (const blk of c.match(/beginbfchar[\s\S]*?endbfchar/g) || [])
      for (const m of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g))
        map.set(parseInt(m[1], 16), hexToStr(m[2]));
    for (const blk of c.match(/beginbfrange[\s\S]*?endbfrange/g) || [])
      for (const m of blk.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
        const lo = parseInt(m[1], 16), hi = parseInt(m[2], 16), dst = parseInt(m[3], 16);
        for (let i = lo; i <= hi && i - lo < 512; i++) map.set(i, String.fromCharCode(dst + (i - lo)));
      }
  }
  return map;
}

function pdfText(buf) {
  const raw = buf.toString('latin1');
  const chunks = inflateAll(raw);
  const cmap = buildCMap(chunks);
  const content = chunks.join('\n');
  const lines = [];
  for (const blk of content.match(/BT[\s\S]*?ET/g) || []) {
    let line = '';
    for (const m of blk.matchAll(/<([0-9A-Fa-f]+)>/g)) {
      const h = m[1];
      for (let i = 0; i + 4 <= h.length; i += 4) {
        const code = parseInt(h.substr(i, 4), 16);
        if (cmap.has(code)) line += cmap.get(code);
      }
    }
    if (line.trim()) lines.push(line.trim());
  }
  return lines;
}

// ── Field parsing ────────────────────────────────────────────────────────────
// Hebrew in these PDFs is stored visually reversed; reverse to read it.
const rev = s => [...s].reverse().join('');

function parseExpiry(lines) {
  // Gregorian date printed right after the Hebrew date.
  // Seen in the wild as DD.MM.YY, D.M.YY and DD/MM/YY.
  const pad = n => String(n).padStart(2, '0');
  for (const l of lines) {
    const m = l.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2}|\d{4})$/);
    if (m) {
      const [, d, mo, y] = m;
      const year = y.length === 4 ? y : '20' + y;
      return `${year}-${pad(mo)}-${pad(d)}`;
    }
  }
  return null;
}

function parseDetails(lines) {
  const txt = lines.map(rev).join(' | ');
  const has = re => re.test(txt);
  return {
    shabbatClosed:  has(/סגור בשבתות/),
    bishulYisrael:  has(/בישול ישראל/),
    noChametz:      has(/ללא חשש חמץ/),
    vegChecked:     has(/ירק עלים.*מניעת חרקים|מניעת חרקים/),
    chalavYisrael:  has(/חלב ישראל/) && !has(/חלב ישראל \/ חו/),
    notRabbanut:    has(/אינה מהווה תעודת הכשר/),
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────
// .replace(/^﻿/, '') strips the UTF-8 BOM places.osm.json carries at byte 0
// — matches validate-data.mjs/kashrut-pipeline.mjs's own readNoBom. Found
// live, 2026-08-27, running --dry to check the cert cliff (docs/KASHRUT_FACTS.md
// §33 logs the same defect in a different script).
const places = JSON.parse(readFileSync(PLACES_PATH, 'utf8').replace(/^﻿/, ''));
const targets = places.filter(p => p.certifiedBy === 'צהר' && p.kosherCertUrl).slice(0, LIMIT);

console.log(`Tzohar-certified places on record: ${targets.length}`);
console.log(`refresh window: ${FORCE_REFRESH ? 'forced (--refresh)' : `${REFRESH_WINDOW_DAYS} days before expiry`}\n`);

let refetched = 0, skipped = 0, renewed = 0, unchanged = 0, noDate = 0, failed = [];

for (const p of targets) {
  const fname = path.join(CACHE, p.id + '.pdf');
  const metaFname = path.join(CACHE, p.id + '.meta.json');
  const previousValidUntil = p.certificateValidUntil;
  const stale = isCacheStale(p.id, previousValidUntil);

  let buf;
  try {
    if (existsSync(fname) && !stale) {
      buf = readFileSync(fname);
      skipped++;
    } else {
      const res = await fetch(p.kosherCertUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(fname, buf);
      writeFileSync(metaFname, JSON.stringify({ fetchedAt: todayISO, url: p.kosherCertUrl }));
      refetched++;
    }
    const lines = pdfText(buf);
    const expiry = parseExpiry(lines);
    const details = parseDetails(lines);

    if (expiry) {
      p.certificateValidUntil = expiry;
      p.kosherDetails = details;
      if (previousValidUntil && expiry > previousValidUntil) {
        renewed++;
        console.log(`  ✓ RENEWED  ${p.name.padEnd(30).slice(0, 30)} ${previousValidUntil} → ${expiry}`);
      } else {
        unchanged++;
        if (stale) console.log(`  ✓ unchanged ${p.name.padEnd(29).slice(0, 29)} ${expiry} (re-checked, same as before)`);
      }
    } else {
      noDate++;
      console.log(`  ? ${p.name.padEnd(34).slice(0, 34)} — no date found${stale ? ' (re-checked)' : ''}`);
    }
  } catch (e) {
    // Fetch or parse failed — leave certificateValidUntil untouched. An
    // already-expired record stays expired; we never guess a renewal.
    failed.push(`${p.name}: ${e.message}`);
    console.log(`  ✗ ${p.name.padEnd(34).slice(0, 34)} ${e.message}`);
  }
}

// places.osm.json is kept minified — it ships in the web bundle.
if (!DRY) writeFileSync(PLACES_PATH, JSON.stringify(places), 'utf8');

const stillExpired = places.filter(p => p.certificateValidUntil && p.certificateValidUntil < todayISO);

console.log(`\n=== Certificate expiry extraction — ${todayISO} ===`);
console.log(`businesses checked      : ${targets.length}`);
console.log(`  re-fetched from source: ${refetched}  (${skipped} served from a still-fresh cache)`);
console.log(`  renewed (new date)    : ${renewed}`);
console.log(`  unchanged              : ${unchanged}`);
console.log(`  no date in PDF         : ${noDate}`);
console.log(`  retrieval/parse failed : ${failed.length}`);
failed.forEach(f => console.log('     ' + f));
console.log(`currently expired (all Tzohar records, after this run): ${stillExpired.length}`);
console.log(DRY ? '\n(dry run — places.osm.json not written; cert-cache/ was still updated)' : `\nwritten to ${path.relative(ROOT, PLACES_PATH)}`);

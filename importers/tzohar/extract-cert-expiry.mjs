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
 * Usage: node importers/tzohar/extract-cert-expiry.mjs [--limit N] [--dry]
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
const LIMIT = args.includes('--limit') ? +args[args.indexOf('--limit') + 1] : Infinity;

if (!existsSync(CACHE)) mkdirSync(CACHE, { recursive: true });

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
const places = JSON.parse(readFileSync(PLACES_PATH, 'utf8'));
const targets = places.filter(p => p.certifiedBy === 'צהר' && p.kosherCertUrl).slice(0, LIMIT);

console.log(`certificates to process: ${targets.length}\n`);

let ok = 0, noDate = 0, failed = [];

for (const p of targets) {
  const fname = path.join(CACHE, p.id + '.pdf');
  let buf;
  try {
    if (existsSync(fname)) {
      buf = readFileSync(fname);
    } else {
      const res = await fetch(p.kosherCertUrl);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(fname, buf);
    }
    const lines = pdfText(buf);
    const expiry = parseExpiry(lines);
    const details = parseDetails(lines);

    if (expiry) {
      p.certificateValidUntil = expiry;
      p.kosherDetails = details;
      ok++;
      console.log(`  ✓ ${p.name.padEnd(34).slice(0, 34)} ${expiry}`);
    } else {
      noDate++;
      console.log(`  ? ${p.name.padEnd(34).slice(0, 34)} — no date found`);
    }
  } catch (e) {
    failed.push(`${p.name}: ${e.message}`);
    console.log(`  ✗ ${p.name.padEnd(34).slice(0, 34)} ${e.message}`);
  }
}

// places.osm.json is kept minified — it ships in the web bundle.
if (!DRY) writeFileSync(PLACES_PATH, JSON.stringify(places), 'utf8');

console.log(`\n=== Certificate expiry extraction ===`);
console.log(`expiry extracted : ${ok}`);
console.log(`no date in PDF   : ${noDate}`);
console.log(`download failed  : ${failed.length}`);
failed.forEach(f => console.log('   ' + f));
console.log(DRY ? '\n(dry run — nothing written)' : `\nwritten to ${path.relative(ROOT, PLACES_PATH)}`);

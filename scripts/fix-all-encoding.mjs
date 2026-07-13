/**
 * Fix double-encoded UTF-8 (via Windows-1252) strings in all JSON data files.
 * The original pipeline read UTF-8 files as Windows-1252 and re-encoded as UTF-8,
 * so Hebrew bytes (e.g. aleph D7 90) became the CP1252 chars × + control, then
 * re-encoded to UTF-8 (C3 97 C2 90). This script reverses that process.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED = join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const FILES = ['places.osm.json', 'restaurants.osm.json', 'cities.osm.json'];

function readJsonNoBom(path) {
  const buf = readFileSync(path);
  const str = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF
    ? buf.slice(3).toString('utf8')
    : buf.toString('utf8');
  return JSON.parse(str);
}

function writeJsonWithBom(path, data) {
  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8');
  writeFileSync(path, Buffer.concat([BOM, content]));
}

// Windows-1252 reverse map: Unicode codepoint -> byte value for 0x80-0x9F range
const CP1252_UNICODE_TO_BYTE = new Map([
  [0x20AC, 0x80], [0x201A, 0x82], [0x0192, 0x83], [0x201E, 0x84],
  [0x2026, 0x85], [0x2020, 0x86], [0x2021, 0x87], [0x02C6, 0x88],
  [0x2030, 0x89], [0x0160, 0x8A], [0x2039, 0x8B], [0x0152, 0x8C],
  [0x017D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93],
  [0x201D, 0x94], [0x2022, 0x95], [0x2013, 0x96], [0x2014, 0x97],
  [0x02DC, 0x98], [0x2122, 0x99], [0x0161, 0x9A], [0x203A, 0x9B],
  [0x0153, 0x9C], [0x017E, 0x9E], [0x0178, 0x9F],
]);

function cpToByte(cp) {
  if (cp <= 0xFF) return cp; // ASCII + Latin-1: code point == byte value in CP1252
  const mapped = CP1252_UNICODE_TO_BYTE.get(cp);
  return mapped !== undefined ? mapped : -1; // -1 = unmappable
}

function fixDouble(str) {
  if (!str || typeof str !== 'string') return str;
  // Already real Hebrew? Leave it.
  if (/[א-׺]/.test(str)) return str;
  // No extended Latin? Not double-encoded.
  if (!/[À-ɏ -⟿]/.test(str)) return str;
  // Try to reverse CP1252 decode
  const bytes = [];
  for (const ch of str) {
    const byte = cpToByte(ch.codePointAt(0));
    if (byte === -1) return str; // unmappable char -> leave original
    bytes.push(byte);
  }
  try {
    const decoded = Buffer.from(bytes).toString('utf8');
    if (/[א-׺]/.test(decoded)) return decoded;
  } catch {}
  return str;
}

function fixObject(obj) {
  if (typeof obj === 'string') return fixDouble(obj);
  if (Array.isArray(obj)) return obj.map(fixObject);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[k] = fixObject(v);
    return out;
  }
  return obj;
}

let totalFixed = 0;

for (const filename of FILES) {
  const path = join(GENERATED, filename);
  const data = readJsonNoBom(path);
  const ts = '20260713';

  // Only backup if not already backed up this session
  try { copyFileSync(path, path.replace('.json', `.pre-fixall-${ts}.backup.json`)); } catch {}

  const fixed = fixObject(data);

  let count = 0;
  if (Array.isArray(fixed)) {
    for (let i = 0; i < fixed.length; i++) {
      if (JSON.stringify(fixed[i]) !== JSON.stringify(data[i])) count++;
    }
  }
  totalFixed += count;
  console.log(`${filename}: fixed ${count} records`);

  writeJsonWithBom(path, fixed);
}

console.log(`\ntotal fixed: ${totalFixed}`);

// Spot check
const places = readJsonNoBom(join(GENERATED, 'places.osm.json'));
const aruma = places.find(p => p.name && p.name.includes('ארומה'));
const shoham = places.find(p => p.cityId === 'שוהם');
console.log('aruma check:', aruma ? aruma.name + ' / ' + aruma.cityId : 'not found');
console.log('shoham check:', shoham ? shoham.name : 'not found');
// Show a sample name raw
const s = places.find(p => p.name && /[א-׺]/.test(p.name));
console.log('first Hebrew name in result:', s && s.name);

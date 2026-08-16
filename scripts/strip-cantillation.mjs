/**
 * Post-processor: strips cantillation marks (trope / teamei hamikra) from tehillimText.ts.
 * Uses charCodeAt comparisons — no regex, no encoding issues.
 *
 * Removes: U+0591-U+05AF (Hebrew accents), U+05C0 (PASEQ = the | character),
 *          U+05C3-U+05C6 (SOF PASUQ etc.)
 * Keeps:   U+05B0-U+05C2 (nikud / vowel marks)
 *
 * Usage:   node scripts/strip-cantillation.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FILE = join(__dirname, '..', 'src', 'data', 'tehillimText.ts');

function isCantillation(code) {
  // Hebrew accent marks: U+0591 .. U+05AF
  if (code >= 0x0591 && code <= 0x05AF) return true;
  // PASEQ (the | pipe character): U+05C0
  if (code === 0x05C0) return true;
  // SOF PASUQ, NUN HAFUKHA, etc.: U+05C3 .. U+05C6
  if (code >= 0x05C3 && code <= 0x05C6) return true;
  return false;
}

function stripCantillation(text) {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    if (!isCantillation(text.charCodeAt(i))) {
      out += text[i];
    }
  }
  return out;
}

const src = readFileSync(FILE, 'utf8');
const fixed = stripCantillation(src);

// Count removed characters
const removed = src.length - fixed.length;

writeFileSync(FILE, fixed, 'utf8');

console.log('Done.');
console.log('Characters removed: ' + removed);

// Verify: check for paseq U+05C0
const hasPaseq = fixed.split('').some((c) => c.charCodeAt(0) === 0x05C0);
console.log('Paseq still present: ' + hasPaseq);

// Check for any remaining cantillation
let remaining = 0;
for (let i = 0; i < fixed.length; i++) {
  if (isCantillation(fixed.charCodeAt(i))) remaining++;
}
console.log('Remaining cantillation chars: ' + remaining);

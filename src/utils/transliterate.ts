const MAP: Record<string, string> = {
  'א': 'a', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h',
  'ו': 'o', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'i',
  'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm',
  'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '',  'פ': 'p',
  'ף': 'f', 'צ': 'tz','ץ': 'tz','ק': 'k', 'ר': 'r',
  'ש': 'sh','ת': 't',
};

const HEBREW_RE = /[א-ת]/;
const NIQQUD_RE = /[ְ-ׇ]/g;

function transliterateWord(word: string): string {
  const clean = word.replace(NIQQUD_RE, '');
  let out = '';
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch in MAP) {
      // ה at end of word is typically silent (feminine ending)
      if (ch === 'ה' && i === clean.length - 1) continue;
      out += MAP[ch];
    } else {
      out += ch;
    }
  }
  return out ? out[0].toUpperCase() + out.slice(1) : word;
}

/**
 * Transliterates a Hebrew string to approximate Latin phonetics.
 * Non-Hebrew characters (digits, Latin, punctuation) pass through unchanged.
 * Returns the original string if it contains no Hebrew.
 */
export function transliterateHebrew(text: string): string {
  if (!HEBREW_RE.test(text)) return text;
  return text.split(' ').map(transliterateWord).join(' ');
}

/** True when the string contains at least one Hebrew character. */
export function isHebrew(text: string): boolean {
  return HEBREW_RE.test(text);
}

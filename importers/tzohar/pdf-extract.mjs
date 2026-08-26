/**
 * Tzohar certificate PDF text extraction — the shared core used by both
 * extract-cert-expiry.mjs (the live refresh tool) and the Stage 3
 * identity/date-comparison tooling under importers/tzohar/. Extracted out
 * of extract-cert-expiry.mjs rather than duplicated a second time
 * (docs/KASHRUT_FACTS.md §17 face 3) — this is the ONLY place this parsing
 * logic is defined; extract-cert-expiry.mjs imports it.
 *
 * The PDFs carry a real text layer over a scanned-looking background.
 * Hebrew is stored visually reversed in the content stream; digits and
 * Latin text are not. pdfText() returns raw (un-reversed) lines in stream
 * order — callers reverse individual lines with rev() where they need to
 * read Hebrew, and match digit patterns against the raw line directly.
 */
import zlib from 'zlib';

// ── low-level PDF stream decoding ───────────────────────────────────────
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

const hexToStr = (h) => {
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

/** Every line of visible text in the PDF, in stream order. Un-reversed — see module header. */
export function pdfText(buf) {
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

/** Hebrew in these PDFs is stored visually reversed; reverse to read it. */
export const rev = (s) => [...s].reverse().join('');

// ── field parsing ────────────────────────────────────────────────────────

/** DD.MM.YY / D.M.YY / DD/MM/YY expiry, printed right after the Hebrew date. Restaurant/cafe certs. */
export function parseExpiry(lines) {
  const pad = (n) => String(n).padStart(2, '0');
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

/**
 * Winery certs state a HARVEST/VINTAGE YEAR ("הפיקוח על יינות בציר תשפ״ד"),
 * never an expiry date — confirmed on a real fetched cert (drayer.pdf,
 * 2026-08-26): no line matches parseExpiry()'s pattern at all, but a
 * 4-digit Gregorian year appears split across two adjacent short numeric
 * lines near a "בציר" marker (e.g. lines "4" then "202", concatenated in
 * REVERSE of stream order — the same visual-reversal PDFs apply to Hebrew
 * text — reads as "2024"). Returns null, not a guess, when no such pattern
 * is found — this is a distinct signal from parseExpiry() returning null,
 * so callers should try both rather than assume a null expiry means "no
 * validity info at all."
 */
export function parseVintageYear(lines) {
  const vintageIdx = lines.findIndex((l) => rev(l).includes('בציר'));
  if (vintageIdx === -1) return null;
  // The year is typically split across the few lines following the "בציר" marker,
  // as short (1-3 digit) purely-numeric fragments, concatenated in reverse order.
  const window = lines.slice(vintageIdx, vintageIdx + 6).filter((l) => /^\d{1,3}$/.test(l));
  if (window.length === 0) return null;
  const joined = window.slice().reverse().join('');
  const m = joined.match(/(19|20)\d{2}/);
  return m ? m[0] : null;
}

/**
 * One comparable "how long is this certificate valid for" signal,
 * regardless of which format the source uses. Distinguishes a genuine
 * absence of validity info (kind: 'unknown') from the two known formats,
 * so a caller comparing two certificates never silently treats "couldn't
 * parse either" as "they agree."
 */
export function parseValiditySignal(lines) {
  const expiry = parseExpiry(lines);
  if (expiry) return { kind: 'expiry-date', value: expiry };
  const vintage = parseVintageYear(lines);
  if (vintage) return { kind: 'vintage-year', value: vintage };
  return { kind: 'unknown', value: null };
}

export function parseDetails(lines) {
  const txt = lines.map(rev).join(' | ');
  const has = (re) => re.test(txt);
  return {
    shabbatClosed: has(/סגור בשבתות/),
    bishulYisrael: has(/בישול ישראל/),
    noChametz: has(/ללא חשש חמץ/),
    vegChecked: has(/ירק עלים.*מניעת חרקים|מניעת חרקים/),
    chalavYisrael: has(/חלב ישראל/) && !has(/חלב ישראל \/ חו/),
    notRabbanut: has(/אינה מהווה תעודת הכשר/),
  };
}

/**
 * The business name + address printed at the top of the certificate,
 * between the two boilerplate anchor lines every cert opens with ("אני
 * בעל/ת בית העסק" ... "מצהיר/ה בזאת בפני קהל לקוחותינו") — confirmed on
 * three real certs of different shapes (hakosem-4.pdf, drayer.pdf,
 * amaia-1.pdf, 2026-08-26). Returned as one reversed (readable) text blob
 * rather than split into separate name/address fields: the PDF's line
 * breaks don't reliably mark that boundary (a name can span 1-2 lines
 * before the address starts), so precisely delimiting them would be
 * guessing a boundary the source doesn't mark. Stage 3's identity check
 * treats this as a blob to fuzzy-match our record's name/address against,
 * not as two clean fields.
 *
 * The start anchor matches on "בעל" ALONE, not "בעל" AND "בית העסק" on the
 * same line — found necessary on amaia-1.pdf, where the phrase splits
 * across two lines ("אני בעל/ת בית" then "העסק" starts the next line,
 * unlike hakosem/drayer where it's one line). Requiring both substrings on
 * one line silently returned null on that cert, which upstream code was
 * then reading as "no identity to check" — a parsing gap, not a genuine
 * identity mismatch, and conflating the two produced a false WRONG_BUSINESS
 * call on a real record. "בעל" alone is specific enough (part of the
 * ownership-declaration boilerplate, not business content) not to
 * false-positive on an unrelated line.
 */
export function parseIdentity(lines) {
  const startIdx = lines.findIndex((l) => rev(l).includes('בעל'));
  if (startIdx === -1) return null;
  const endIdx = lines.findIndex((l, i) => i > startIdx && rev(l).includes('בזאת בפני קהל'));
  const slice = endIdx === -1 ? lines.slice(startIdx + 1, startIdx + 8) : lines.slice(startIdx + 1, endIdx);
  const text = slice.map(rev).join(' ').replace(/\s+/g, ' ').trim();
  return text || null;
}

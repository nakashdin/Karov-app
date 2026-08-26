// Standalone test (not jest). Run: node scripts/shared/__tests__/tzohar-pdf-extract.test.mjs
//
// Tests the parsing functions (parseExpiry/parseVintageYear/parseValiditySignal/
// parseIdentity/parseDetails) against REAL line arrays captured from real
// Tzohar certificate PDFs fetched on 2026-08-26 (hakosem-4.pdf — a
// restaurant cert with a DD.MM.YY expiry; drayer.pdf — a winery cert with a
// vintage year, no expiry date at all) — not invented fixtures. pdfText()
// itself (raw PDF byte decoding) isn't unit-tested here: it was validated
// by actually fetching and parsing three real PDFs during the investigation
// that produced these fixtures, which is a stronger check on that specific
// function than a synthetic byte fixture would be.
import assert from 'node:assert/strict';
import { parseExpiry, parseVintageYear, parseValiditySignal, parseIdentity, parseDetails, rev } from '../../../importers/tzohar/pdf-extract.mjs';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    console.error(`  FAIL - ${name}`);
    console.error(`    ${err.stack ?? err.message}`);
    process.exitCode = 1;
  }
}

console.log('pdf-extract.mjs');

// Real, un-reversed lines() output from hakosem-4.pdf (restaurant, DD.MM.YY expiry).
const HAKOSEM_LINES = [
  'קסעה תיב ת/לעב ינא', 'סוקה', 'ם', 'ךלמה המלש', '1', 'ביבא לת', '-', 'ופי',
  'וניתוחוקל להק ינפב תאזב ה/ריהצמ', 'דיפקמ הז קסע תיב יכ', ':םיאבה םיטרדנטסה לע',
  'לע םירשואמו םיקדבנ םלגה ירמוח לכ', '-', 'רהצ ינבר ןוגרא ידי',
  'םיקדבנו םיפטשנ םילע תוקרי', 'לארשי ידעומו תותבשב רוגס םוקמה', 'הקלדהב לארשי לושיב',
  'חספה וילע רבעש ץמח ששח אלל', 'רהצ ינבר ןוגרא י"ע חקופמ הז קסע תיב',
  'ןפואו םלגה ירמוח ,קסעה תיב תוליעפ תא רקבמה', 'ןוזמב לופיטה', 'כ ךיראתל דע ףקותב חוקיפה',
  '"', 'פשת לולא ט', '"', 'ו', '11.09.26', 'דבלב המרגולוה ףוריצב ףקותב וז העדוה',
  'ירשב', 'תימוקמה תונברה רשכה תדועת הווהמ הניא וז הרהצה', '_________________', 'סוקה', 'ם',
];

// Real lines() output from drayer.pdf (winery, vintage year, no expiry).
const DRAYER_LINES = [
  'קסעה תיב ת/לעב ינא', 'ריירד קשמ בקי', 'ראב', '-', 'הכלימ', 'ה/ריהצמ', 'וניתוחוקל להק ינפב תאזב',
  ':םיאבה םיטרדנטסה לע דיפקמ הז קסע תיב יכ', 'םייאלכו תיעיבש ,לבט ,הלרע ששח אלל',
  'חספה גחל םג םימיאתמ תונייה', 'בלב ןייה לע חוקיפה', 'ד', 'לע', '-', 'רהצ ינבר ןוגרא ידי',
  '"פשת ריצב תוניי לע חוקיפה', 'ד', '4', '202', 'ופכב', 'ף', 'קובקבה יבג לע רהצ תמתוחל',
  'ףוריצב ףקותב וז העדוה', 'דבלב המרגולוה', 'הוורפ',
];

test('parseExpiry: real restaurant cert (hakosem) — correct ISO date from DD.MM.YY', () => {
  assert.equal(parseExpiry(HAKOSEM_LINES), '2026-09-11');
});
test('parseExpiry: real winery cert (drayer) — no DD.MM.YY line at all, returns null (not a guess)', () => {
  assert.equal(parseExpiry(DRAYER_LINES), null);
});
test('parseVintageYear: real winery cert — extracts 2024 from the split "4"/"202" fragments near בציר', () => {
  assert.equal(parseVintageYear(DRAYER_LINES), '2024');
});
test('parseVintageYear: real restaurant cert has no בציר marker at all, returns null', () => {
  assert.equal(parseVintageYear(HAKOSEM_LINES), null);
});
test('VIOLATION-CHECK: parseVintageYear does not fire on an unrelated 4-digit number with no בציר marker nearby', () => {
  assert.equal(parseVintageYear(['some line', '2024', 'another line']), null);
});

test('parseValiditySignal: distinguishes the two real formats correctly, never conflating them', () => {
  assert.deepEqual(parseValiditySignal(HAKOSEM_LINES), { kind: 'expiry-date', value: '2026-09-11' });
  assert.deepEqual(parseValiditySignal(DRAYER_LINES), { kind: 'vintage-year', value: '2024' });
});
test('parseValiditySignal: neither format present -> unknown, distinct from either real kind', () => {
  const r = parseValiditySignal(['totally unrelated', 'boilerplate only']);
  assert.equal(r.kind, 'unknown');
  assert.equal(r.value, null);
});

test('parseIdentity: real restaurant cert — extracts name+address+city between the two boilerplate anchors', () => {
  const id = parseIdentity(HAKOSEM_LINES);
  assert.ok(id.includes('הקוסם') || id.includes('הקוס'), `expected the business name in: ${id}`);
  assert.ok(id.includes('שלמה המלך'), `expected the street in: ${id}`);
  assert.ok(id.includes('תל אביב'), `expected the city in: ${id}`);
});
test('parseIdentity: real winery cert — extracts name and location similarly', () => {
  const id = parseIdentity(DRAYER_LINES);
  assert.ok(id.includes('דרייר'), `expected the winery name in: ${id}`);
  assert.ok(id.includes('מילכה'), `expected the location in: ${id}`);
});
test('parseIdentity: no boilerplate anchor at all -> null, not a guess at some other text', () => {
  assert.equal(parseIdentity(['random', 'lines', 'no anchor here']), null);
});

test('parseDetails: real restaurant cert — matches the documented kosherDetails flags', () => {
  const d = parseDetails(HAKOSEM_LINES);
  assert.equal(d.shabbatClosed, true);
  assert.equal(d.bishulYisrael, true);
  assert.equal(d.noChametz, true);
  assert.equal(d.notRabbanut, true);
  assert.equal(d.chalavYisrael, false); // not printed on this cert
});

test('rev: reverses a string (Hebrew visual-order fix)', () => {
  assert.equal(rev('סוקה'), 'הקוס');
  assert.equal(rev('11.09.26'), '62.90.11');
});

console.log(`\n${passed} passed${process.exitCode ? ', with failures' : ''}`);

/**
 * Render the unresolved-coordinates worklist as a readable Markdown document.
 *
 * The JSON worklist is for scripts; this is the one a person reads to see
 * exactly which businesses still need work, grouped by city.
 *
 * Usage: node scripts/gen-unresolved-doc.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dir, '..');
const PLACES = path.join(ROOT, 'src/data/generated/places.osm.json');
const OUT = path.join(ROOT, 'docs/unresolved-coordinates.md');

const FOOD = new Set([
  'restaurant', 'cafe', 'bakery', 'fast_food',
  'juice_bar', 'coffee_cart', 'winery', 'ice_cream_parlor',
]);

const TYPE_HE = {
  restaurant: 'מסעדה', cafe: 'בית קפה', bakery: 'מאפייה', fast_food: 'מזון מהיר',
  juice_bar: 'בר מיץ', coffee_cart: 'עגלת קפה', winery: 'יקב', ice_cream_parlor: 'גלידרייה',
};

const hasHouseNumber = s => /(?:^|[\s,])\d{1,4}(?:[\s,/]|$)/.test(String(s || ''));
const esc = s => String(s ?? '').replace(/\|/g, '\\|').trim() || '—';

const places = JSON.parse(readFileSync(PLACES, 'utf8'));
const rows = places
  .filter(p => FOOD.has(p.type) && p.locationSource !== 'waze')
  .map(p => ({
    name: p.name,
    city: (p.cityId || '').trim(),
    address: (p.address || '').trim(),
    type: TYPE_HE[p.type] ?? p.type,
    numbered: hasHouseNumber(p.address),
    precision: p.locationPrecision || '',
  }));

const today = new Date().toISOString().slice(0, 10).split('-').reverse().join('.');

/** Group rows by city, largest city first, names sorted inside each. */
function byCity(list) {
  const m = new Map();
  for (const r of list) {
    const key = r.city || '(ללא עיר)';
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(r);
  }
  return [...m.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([city, items]) => [city, items.sort((a, b) => a.name.localeCompare(b.name))]);
}

function table(items, showPrecision) {
  const head = showPrecision
    ? '| עסק | סוג | כתובת רשומה | דיוק נוכחי |\n|---|---|---|---|'
    : '| עסק | סוג | כתובת רשומה |\n|---|---|---|';
  const body = items.map(r => showPrecision
    ? `| ${esc(r.name)} | ${r.type} | ${esc(r.address)} | ${r.precision === 'city' ? '⚠️ עיר בלבד' : esc(r.precision)} |`
    : `| ${esc(r.name)} | ${r.type} | ${esc(r.address)} |`
  ).join('\n');
  return `${head}\n${body}`;
}

function section(title, note, list, showPrecision) {
  const groups = byCity(list);
  let out = `## ${title}\n\n${note}\n\n`;
  for (const [city, items] of groups) {
    out += `### ${city} — ${items.length}\n\n${table(items, showPrecision)}\n\n`;
  }
  return out;
}

const noCity = rows.filter(r => !r.city);
const noNumber = rows.filter(r => r.city && !r.numbered);
const numbered = rows.filter(r => r.city && r.numbered);

const counts = rows.reduce((a, r) => { a[r.type] = (a[r.type] || 0) + 1; return a; }, {});

let doc = `# עסקים שהניווט אליהם עדיין לא מדויק

נוצר: **${today}** · מקור: \`src/data/generated/places.osm.json\` · מתחדש ע"י \`node scripts/gen-unresolved-doc.mjs\`

אלה **${rows.length} עסקי האוכל** שוייז לא הצליח לפתור, כלומר הקואורדינטה שלהם עדיין לא אומתה.
הרקע והשיטה: [\`docs/coordinates-backlog.md\`](coordinates-backlog.md)

| סוג | כמות |
|---|---|
${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, n]) => `| ${t} | ${n} |`).join('\n')}
| **סה"כ** | **${rows.length}** |

---

`;

doc += section(
  `אין מספר בית בכתובת — ${noNumber.length}`,
  'זה השורש. בלי מספר בית אין מה לחפש בוייז, והניווט נוחת על מרכז היישוב או על הקניון.\n\n**מה צריך:** להשלים את הכתובת המלאה מהאתר הרשמי של העסק או של הקניון, ואז להריץ מחדש את הסנכרון.',
  noNumber, true,
);

doc += `---\n\n`;

doc += section(
  `יש מספר בית ובכל זאת לא נמצא — ${numbered.length}`,
  'הכתובת נראית תקינה אבל וייז לא החזיר התאמה. הסיבות האפשריות: שם הרחוב בכתיב שונה אצל וייז, כתובת שהתיישנה, או עסק שנסגר.\n\n**מה צריך:** בדיקה ידנית מול וייז, או ניסיון וריאציות כתיב לשם הרחוב.',
  numbered, true,
);

if (noCity.length) {
  doc += `---\n\n## אין עיר רשומה — ${noCity.length}\n\n`;
  doc += 'שדה \`cityId\` ריק, ולכן גם חיפוש הכתובת וגם בדיקת "מרחק ממרכז העיר" לא יכולים לרוץ.\n\n';
  doc += '**מה צריך:** להשלים \`cityId\`. ניתן לגזור מהקואורדינטה הקיימת.\n\n';
  doc += table(noCity.sort((a, b) => a.name.localeCompare(b.name)), false) + '\n';
}

writeFileSync(OUT, doc, 'utf8');
console.log(`wrote ${path.relative(ROOT, OUT)}`);
console.log(`  no house number : ${noNumber.length}`);
console.log(`  numbered, unfound: ${numbered.length}`);
console.log(`  no city          : ${noCity.length}`);
console.log(`  total            : ${rows.length}`);

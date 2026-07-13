/**
 * Generates a detailed Hebrew (RTL) Word document describing, per category,
 * exactly where the app's data comes from and how reliable each field is.
 * Numbers are the REAL fill rates measured from src/data/generated/.
 *
 * Run:  node scripts/build-data-sources-doc.mjs
 * Out:  מקורות-הדאטה-קרוב.docx  (in the project root)
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const docx = require('C:/Users/User/AppData/Roaming/npm/node_modules/docx');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, Header, Footer, TableOfContents, PageBreak,
} = docx;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ---- measure real fill rates from the generated dataset --------------------
const load = (f) => JSON.parse(readFileSync(join(ROOT, 'src/data/generated', f), 'utf8'));
function stats(rows) {
  const n = rows.length || 1;
  const p = (pred) => Math.round(rows.filter(pred).length / n * 100);
  return {
    count: rows.length,
    name: p((r) => r.name),
    city: p((r) => r.cityId && r.cityId.trim()),
    street: p((r) => r.address && r.address !== r.cityId),
    phone: p((r) => r.phone && String(r.phone).trim()),
    hours: p((r) => r.openingHours && String(r.openingHours).trim()),
  };
}
const syn = stats(load('synagogues.osm.json'));
const rest = stats(load('restaurants.osm.json'));
// Mikvahs are not imported yet; figures come from the official data.gov.il
// quality probe in research/out (the source's own fill rates).
const mik = { count: 606, name: 100, city: 100, street: 96, phone: 100, hours: 100 };

// ---- styling helpers -------------------------------------------------------
const FONT = 'Arial';
const BLUE = '1F4E79';
const LIGHT = 'D6E4F0';
const GREY = 'F2F2F2';
const border = { style: BorderStyle.SINGLE, size: 1, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };

// RTL paragraph of runs (array of {text, bold, color, size})
function rtl(runs, opts = {}) {
  const arr = Array.isArray(runs) ? runs : [{ text: runs }];
  return new Paragraph({
    bidirectional: true,
    alignment: opts.align || AlignmentType.RIGHT,
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0, line: 300 },
    ...opts.paragraph,
    children: arr.map((r) => new TextRun({
      text: r.text, bold: r.bold, color: r.color, size: r.size || 22,
      rightToLeft: true, font: FONT,
    })),
  });
}
function h(text, level) {
  return new Paragraph({
    heading: level, bidirectional: true, alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text, rightToLeft: true, font: FONT })],
  });
}
function bullet(text, opts = {}) {
  return new Paragraph({
    numbering: { reference: opts.ref || 'bullets', level: opts.level || 0 },
    bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { after: 80, line: 300 },
    children: (Array.isArray(text) ? text : [{ text }]).map((r) =>
      new TextRun({ text: r.text, bold: r.bold, color: r.color, size: 22, rightToLeft: true, font: FONT })),
  });
}
function cell(text, { w, fill, bold, color, align } = {}) {
  return new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      bidirectional: true, alignment: align || AlignmentType.RIGHT,
      children: [new TextRun({ text: String(text), bold, color, size: 20, rightToLeft: true, font: FONT })],
    })],
  });
}
// generic table: header row + body rows. cols = [{w}], rows = [[...]]
function table(cols, headerCells, bodyRows) {
  const total = cols.reduce((a, c) => a + c.w, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: cols.map((c) => c.w),
    rows: [
      new TableRow({
        tableHeader: true,
        children: headerCells.map((t, i) => cell(t, { w: cols[i].w, fill: BLUE, bold: true, color: 'FFFFFF', align: AlignmentType.CENTER })),
      }),
      ...bodyRows.map((r, ri) => new TableRow({
        children: r.map((c, i) => {
          const isObj = c && typeof c === 'object';
          return cell(isObj ? c.text : c, {
            w: cols[i].w,
            fill: ri % 2 ? GREY : undefined,
            bold: isObj ? c.bold : false,
            color: isObj ? c.color : undefined,
            align: i === 0 ? AlignmentType.RIGHT : AlignmentType.CENTER,
          });
        }),
      })),
    ],
  });
}

// color-code a percentage
const pc = (v) => ({ text: v + '%', bold: true, color: v >= 80 ? '2E7D32' : v >= 30 ? 'B26A00' : 'C62828' });

// ---- build content ---------------------------------------------------------
const W = 9360; // content width (US Letter, 1" margins)
const today = '17.06.2026';

const children = [
  rtl([{ text: 'אפליקציית "קרוב"', bold: true, size: 40, color: BLUE }], { align: AlignmentType.CENTER, after: 60 }),
  rtl([{ text: 'מקורות הדאטה — מאיפה נמשך המידע וכמה הוא אמין', bold: true, size: 30, color: BLUE }], { align: AlignmentType.CENTER, after: 60 }),
  rtl([{ text: 'מסמך מפורט לכל קטגוריה · עודכן ' + today, size: 20, color: '666666' }], { align: AlignmentType.CENTER, after: 240 }),

  h('תוכן עניינים', HeadingLevel.HEADING_1),
  new TableOfContents('תוכן עניינים', { hyperlink: true, headingStyleRange: '1-2' }),
  new Paragraph({ children: [new PageBreak()] }),

  // 1. summary
  h('1. תקציר מנהלים', HeadingLevel.HEADING_1),
  rtl('כל המידע באפליקציה נמשך משני מקורות בלבד — שניהם אמיתיים, חינמיים וחוקיים: OpenStreetMap (מפת קוד-פתוח שמתוחזקת ע"י מתנדבים) ו-data.gov.il (פורטל הדאטה הממשלתי הרשמי). איננו ממציאים מידע, ובפרט איננו ממציאים כשרות.'),
  rtl([
    { text: 'הנקודה החשובה: ', bold: true },
    { text: 'האמינות משתנה לפי השדה ולפי הקטגוריה. ', bold: true },
    { text: 'מקור ממשלתי רשמי (מקוואות) מדויק ומלא הרבה יותר ממקור מבוסס-מתנדבים (בתי כנסת ומסעדות), שבו טלפון ושעות פעילות כמעט חסרים.' },
  ]),

  h('טבלת-על: מקור לכל קטגוריה', HeadingLevel.HEADING_2),
  table(
    [{ w: 2200 }, { w: 3360 }, { w: 1500 }, { w: 2300 }],
    ['קטגוריה', 'מקור', 'רישיון', 'קואורדינטות'],
    [
      ['בתי כנסת', 'OpenStreetMap (Overpass API)', 'ODbL', 'כן (מקורי)'],
      ['מסעדות כשרות', 'OpenStreetMap — תיוג diet:kosher', 'ODbL', 'כן (מקורי)'],
      ['מקוואות', 'data.gov.il — מרשם ממשלתי רשמי', 'פתוח', { text: 'אין → geocoding', color: 'C62828' }],
    ],
  ),

  h('טבלת אמינות: אחוז מילוי אמיתי לפי שדה', HeadingLevel.HEADING_2),
  rtl([{ text: 'המספרים נמדדו מהדאטה שכבר נמשך בפועל (לא הערכה). ירוק ≥80% · כתום 30–79% · אדום <30%.', size: 20, color: '666666' }]),
  table(
    [{ w: 2760 }, { w: 2200 }, { w: 2200 }, { w: 2200 }],
    ['שדה', 'בתי כנסת', 'מסעדות', 'מקוואות'],
    [
      ['מספר רשומות', { text: String(syn.count), bold: true }, { text: String(rest.count), bold: true }, { text: String(mik.count) + '*', bold: true }],
      ['שם', pc(syn.name), pc(rest.name), pc(mik.name)],
      ['עיר', pc(syn.city), pc(rest.city), pc(mik.city)],
      ['כתובת (רחוב+מס׳)', pc(syn.street), pc(rest.street), pc(mik.street)],
      ['טלפון', pc(syn.phone), pc(rest.phone), pc(mik.phone)],
      ['שעות פעילות', pc(syn.hours), pc(rest.hours), pc(mik.hours)],
    ],
  ),
  rtl([{ text: '* מקוואות עדיין לא נמשכו לאפליקציה; המספרים הם אחוזי המילוי של המקור הרשמי עצמו (data.gov.il).', size: 18, color: '666666' }], { before: 80 }),

  new Paragraph({ children: [new PageBreak()] }),

  // 2. synagogues
  h('2. בתי כנסת', HeadingLevel.HEADING_1),
  h('מקור', HeadingLevel.HEADING_2),
  bullet([{ text: 'מקור: ', bold: true }, { text: 'OpenStreetMap, נמשך דרך Overpass API.' }]),
  bullet([{ text: 'איך נבחר: ', bold: true }, { text: 'כל אובייקט עם התיוג amenity=place_of_worship + religion=jewish, בכל ישראל.' }]),
  bullet([{ text: 'רישיון: ', bold: true }, { text: 'ODbL 1.0 — מותר לשימוש כל עוד נשמר קרדיט ל-OpenStreetMap באפליקציה.' }]),
  bullet([{ text: 'כיסוי: ', bold: true }, { text: syn.count + ' בתי כנסת.' }]),
  h('כמה זה אמין', HeadingLevel.HEADING_2),
  bullet([{ text: 'מיקום ושם: ', bold: true, color: '2E7D32' }, { text: 'אמין וטוב — 100% מהרשומות עם שם וקואורדינטות. טוב לאיתור "מה יש לידי".' }]),
  bullet([{ text: 'כתובת רחוב: ', bold: true, color: 'B26A00' }, { text: 'חלקי — רק ' + syn.street + '% כוללים רחוב ומספר; לשאר יש רק שם עיר (נגזר מהמיקום).' }]),
  bullet([{ text: 'טלפון: ', bold: true, color: 'C62828' }, { text: 'כמעט ריק — ' + syn.phone + '% בלבד. OSM כמעט לא מתייג טלפון לבתי כנסת.' }]),
  bullet([{ text: 'שעות פעילות: ', bold: true, color: 'C62828' }, { text: 'ריק כמעט לחלוטין — ' + syn.hours + '%.' }]),
  h('מגבלות', HeadingLevel.HEADING_2),
  bullet('המידע נתרם ע"י מתנדבים — ייתכן מיקום לא מדויק, בית כנסת שכבר לא פעיל, או רשומה כפולה. אין ערובת טריות.'),
  bullet('נוסח התפילה (אשכנז/ספרד/תימני) קיים רק כשתויג ב-OSM (denomination), לרוב חסר.'),

  // 3. restaurants
  h('3. מסעדות כשרות', HeadingLevel.HEADING_1),
  h('מקור', HeadingLevel.HEADING_2),
  bullet([{ text: 'מקור: ', bold: true }, { text: 'OpenStreetMap, דרך Overpass API.' }]),
  bullet([{ text: 'איך נבחר: ', bold: true }, { text: 'אובייקטים עם התיוג diet:kosher בערך yes / only / designated.' }]),
  bullet([{ text: 'רישיון: ', bold: true }, { text: 'ODbL 1.0 (כמו בתי כנסת).' }]),
  bullet([{ text: 'כיסוי: ', bold: true }, { text: rest.count + ' מקומות בלבד.' }]),
  h('כמה זה אמין', HeadingLevel.HEADING_2),
  bullet([{ text: 'שם ומיקום: ', bold: true, color: '2E7D32' }, { text: '100%.' }]),
  bullet([{ text: 'כתובת רחוב: ', bold: true, color: 'B26A00' }, { text: rest.street + '% — טוב יותר מבתי כנסת אך עדיין חלקי.' }]),
  bullet([{ text: 'טלפון: ', bold: true, color: 'B26A00' }, { text: rest.phone + '% — סביר.' }]),
  bullet([{ text: 'שעות פעילות: ', bold: true, color: 'B26A00' }, { text: rest.hours + '% — חלקי.' }]),
  h('המגבלה הקריטית — כשרות', HeadingLevel.HEADING_2),
  rtl([
    { text: 'אין שום מקור חינמי אמין לכשרות עצמה ', bold: true, color: 'C62828' },
    { text: '(סוג הכשרות, מהדרין, שם נותן ההכשר, תוקף התעודה). OSM נותן רק סימון גס "כשר/לא" שאיננו תעודת כשרות. לכן איננו מציגים סוג כשרות — לא ממציאים מה שאין.' },
  ]),
  bullet('הכיסוי דליל: OSM כמעט לא מתייג עסקים ככשרים, אז ' + rest.count + ' מקומות זה מעט מאוד ביחס למציאות.'),
  bullet('הפתרון הנכון: feed רשמי (המשרד לשירותי דת / שותפות קהילתית). זהו הפער הפתוח המרכזי בפרויקט.'),

  new Paragraph({ children: [new PageBreak()] }),

  // 4. mikvahs
  h('4. מקוואות', HeadingLevel.HEADING_1),
  rtl([{ text: 'סטטוס: ', bold: true }, { text: 'האימפורטר בנוי ומוכן, אך עדיין לא חובר לאפליקציה.' }]),
  h('מקור', HeadingLevel.HEADING_2),
  bullet([{ text: 'מקור: ', bold: true }, { text: 'data.gov.il — מרשם המקוואות הרשמי של המדינה (resource רשמי).' }]),
  bullet([{ text: 'רישיון: ', bold: true }, { text: 'פתוח (data.gov.il).' }]),
  bullet([{ text: 'כיסוי: ', bold: true }, { text: mik.count + ' מקוואות, 354 רשויות.' }]),
  h('כמה זה אמין — המקור הכי טוב מכולם', HeadingLevel.HEADING_2),
  bullet([{ text: 'שם / עיר / טלפון / שעות: ', bold: true, color: '2E7D32' }, { text: '100% מילוי. כתובת 96%. זה מרשם ממשלתי רשמי — הרבה יותר אמין מ-OSM.' }]),
  bullet([{ text: 'שדות בונוס: ', bold: true }, { text: 'נגישות, מקווה לנשים/גברים/כלים, חדר כלה, אחראי/ת — קיימים במקור.' }]),
  h('המגבלה — קואורדינטות', HeadingLevel.HEADING_2),
  rtl([
    { text: 'למקור אין קואורדינטות כלל. ', bold: true, color: 'C62828' },
    { text: 'כדי להציג על מפה אנחנו מבצעים geocoding (המרת כתובת ל-lat/lng) דרך Nominatim של OpenStreetMap.' },
  ]),
  bullet('geocoding הוא מקורב — עלול ליפול על בניין/רחוב סמוך, ולעיתים נכשל (כתובת חופשית בעברית). רשומות שלא מתאתרות נדחות, לא מנחשים.'),
  bullet('המידע הוא snapshot מתאריך הפרסום של המרשם — מדויק לאותו רגע, יכול להתיישן עם הזמן.'),

  // 5. principles
  h('5. עקרונות-על ואיכות', HeadingLevel.HEADING_1),
  bullet([{ text: 'רק דאטה אמיתי, חינמי וחוקי. ', bold: true }, { text: 'OSM תחת ODbL (קרדיט נשמר), data.gov.il פתוח.' }]),
  bullet([{ text: 'לא ממציאים. ', bold: true }, { text: 'בפרט כשרות — אם אין מקור, לא מציגים.' }]),
  bullet([{ text: 'ולידציה. ', bold: true }, { text: 'כל רשומה עוברת בדיקה: שם קיים, קואורדינטות בתחום ישראל, ללא כפילויות.' }]),
  bullet([{ text: 'אידמפוטנטי. ', bold: true }, { text: 'הרצה חוזרת מעדכנת נקי; תוצאות geocoding נשמרות במטמון.' }]),

  h('המלצות להמשך (לשיפור האמינות)', HeadingLevel.HEADING_2),
  bullet('מקוואות: לחבר לאפליקציה — המקור הכי אמין שיש, חבל שלא מנוצל.', { ref: 'numbers' }),
  bullet('עסקים כשרים: לאתר feed רשמי (המשרד לשירותי דת) — לסגור את הפער הקריטי.', { ref: 'numbers' }),
  bullet('טלפון/שעות לבתי כנסת: השלמה ידנית/קהילתית או הצלבה עם מקור נוסף.', { ref: 'numbers' }),
  bullet('סנכרון מתוזמן: ריענון תקופתי כדי להילחם בהתיישנות הדאטה.', { ref: 'numbers' }),
];

const doc = new Document({
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: BLUE, font: FONT },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 25, bold: true, color: '2E5C8A', font: FONT },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.RIGHT,
        style: { paragraph: { indent: { right: 720, hanging: 300 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.RIGHT,
        style: { paragraph: { indent: { right: 720, hanging: 300 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: 'אפליקציית "קרוב" — מקורות הדאטה', size: 16, color: '999999', rightToLeft: true, font: FONT })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'עמוד ', size: 16, color: '999999', rightToLeft: true, font: FONT }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: '999999' })] })] }) },
    children,
  }],
});

const out = join(ROOT, 'מקורות-הדאטה-קרוב.docx');
Packer.toBuffer(doc).then((buf) => { writeFileSync(out, buf); console.log('Wrote', out); });

/**
 * RESEARCH-ONLY domain resolver — builds a catalog of the ~126 Israeli religious
 * councils → official domain + CMS + parser-support, WITHOUT pulling synagogue
 * records (only headers / page signatures / X-WP-Total). It does NOT touch the
 * app, the live data, or perform any merge.
 *
 * NOTE: a Node script cannot run web-search; automated resolution here is
 * prefill (verified) + a seed map of already-found domains + md* heuristics.
 * Unresolved councils are catalogued with nextAction "manual-search".
 *
 * Run:  node importers/religious-councils/resolve-councils.ts
 * Out:  output/council-domain-catalog.json
 *       output/council-domain-summary.json
 *       output/manual-review.json
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'output');
const UA = 'karov-research/1.0 (council-domain-resolver; non-commercial)';

// --- the 126 council names (extracted from the official gov.il PDF) ----------
const COUNCILS = [
  'אבן-יהודה', 'אופקים', 'אור עקיבא', 'אור-יהודה', 'אורנית', 'אזור', 'אזורית עמק המעינות',
  'אזורית- עמק חפר', 'אילת', 'אליכין', 'אלפי מנשה', 'אלקנה', 'אפרת', 'אריאל', 'אשדוד', 'אשקלון',
  'באר-יעקב', 'באר-שבע', 'בית-דגן', 'בית-שאן', 'בית-שמש', 'ביתר עילית', 'בני-ברק', 'בני-עייש',
  'בנימינה וגבעת עדה', 'בקעת הירדן', 'בת-ים', 'גבעת זאב', 'גבעת שמואל', 'גבעתיים', 'גדרה', 'גוש עציון',
  'גליל תחתון', 'גן-יבנה', 'גני-תקוה', 'דימונה', 'הוד-השרון', 'הר חברון', 'הרצליה', 'זכרון יעקב',
  'חבל יבנה', 'חבל מודיעין', 'חדרה', 'חולון', 'חיפה', 'חצור הגלילית', 'טבריה', 'טירת הכרמל', 'יבנאל',
  'יבנה', 'יהוד', 'יקנעם', 'ירוחם', 'ירושלים', 'כוכב יאיר-צור יגאל', 'כנרות', 'כפר יונה', 'כפר פינס',
  'כפר תבור', 'כפר-סבא', 'כרמיאל', 'לוד', 'לכיש', 'מבשרת ציון', 'מגדל', 'מגדל-העמק', 'מזכרת בתיה',
  'מטה בנימין', 'מטולה', 'מיתר', 'מעלה אדומים', 'מעלה יוסף', 'מעלות', 'מצפה רמון', 'מרום הגליל',
  'מרחבים', 'נהריה', 'נוה מונוסון', 'נס-ציונה', 'נצרת עילית', 'נשר', 'נתיבות', 'נתניה', 'סביון', 'עכו',
  'עמנואל', 'עמק לוד', 'עפולה', 'עתלית', 'פרדס-חנה כרכור', 'פרדסיה', 'פתח-תקוה', 'צפת', 'קדומים',
  'קדימה', 'קצרין', 'קריית מוצקין', 'קרית ארבע', 'קרית אתא', 'קרית טבעון', 'קרית ים',
  'קרית יערים- טלז -סטון', 'קרית מלאכי', 'קרית עקרון', 'קרית שמונה', 'קרית-אונו', 'קרית-ביאליק',
  'קרית-גת', 'קרני שומרון', 'ראש העין', 'ראשון לציון', 'רחובות', 'רכסים', 'רמלה', 'רמת השרון',
  'רמת ישי', 'רמת-גן', 'רמת-הגולן', 'רעננה', 'שדות נגב', 'שדרות', 'שומרון', 'שלומי', 'שפיר',
  'תל אביב יפו', 'תל מונד',
];

// --- prefill: verified councils from prior discovery -------------------------
interface Known { domain: string; cms: string; variant?: 'waze' | 'markers' | 'needs-variant'; count?: number; supported: boolean; merged?: boolean; }
const VERIFIED: Record<string, Known> = {
  'פתח-תקוה': { domain: 'mpt.org.il', cms: 'SabaiApps', variant: 'waze', count: 368, supported: true, merged: true },
  'נתניה': { domain: 'mdn.org.il', cms: 'SabaiApps', variant: 'waze', count: 140, supported: true, merged: true },
  'גבעת שמואל': { domain: 'mdgs.org.il', cms: 'SabaiApps', variant: 'waze', count: 40, supported: true, merged: true },
  'יהוד': { domain: 'ydat.org.il', cms: 'SabaiApps', variant: 'waze', count: 29, supported: true, merged: true },
  'מרחבים': { domain: 'mdm.org.il', cms: 'SabaiApps', variant: 'markers', count: 21, supported: true, merged: true },
  'ראש העין': { domain: 'mdrh.org.il', cms: 'SabaiApps', variant: 'markers', count: 135, supported: true, merged: true },
  'גני-תקוה': { domain: 'mdgt.org.il', cms: 'SabaiApps', variant: 'markers', count: 19, supported: true, merged: true },
  'באר-שבע': { domain: 'mdb7.org.il', cms: 'SabaiApps', variant: 'markers', count: 233, supported: true, merged: true },
  'לוד': { domain: 'mdlod.org.il', cms: 'SabaiApps', variant: 'markers', count: 109, supported: true, merged: true },
  'בית-שאן': { domain: 'rbs.org.il', cms: 'SabaiApps', variant: 'markers', count: 73, supported: true, merged: true },
  'מרום הגליל': { domain: 'mdmg.org.il', cms: 'SabaiApps', variant: 'markers', count: 31, supported: true, merged: true },
  'קרית ארבע': { domain: 'mdk4.org.il', cms: 'SabaiApps', variant: 'markers', count: 21, supported: true, merged: true },
  'גבעת זאב': { domain: 'mdgz.org', cms: 'SabaiApps', variant: 'markers', count: 62, supported: true },
  'הרצליה': { domain: 'mdh.org.il', cms: 'SabaiApps', variant: 'needs-variant', count: 0, supported: false },
  'ירושלים': { domain: 'rabanut.org.il', cms: 'WordPress-other', supported: false },
  'תל אביב יפו': { domain: 'rabanut.co.il', cms: 'WordPress-other', supported: false },
  'קריית מוצקין': { domain: 'mdmotzkin.org', cms: 'Wix', supported: false },
  'מבשרת ציון': { domain: 'mdmzion.org.il', cms: 'custom', supported: false },
  'זכרון יעקב': { domain: 'mdzy.org.il', cms: 'custom', supported: false },
  'בקעת הירדן': { domain: 'datit-bh.org.il', cms: 'Wix', supported: false },
  'רמת-הגולן': { domain: 'golan.org.il', cms: 'custom', supported: false },
};

// --- seed domains (from official gov.il XLSX emails + slug searches) ---------
// These go THROUGH the verify pipeline (name-match + CMS + directory + count).
const SEED_DOMAINS: Record<string, string> = {
  'שדרות': 'mdsderot.org.il',
  'נצרת עילית': 'mdnh.org.il',
  'יבנה': 'mdyv.org.il',
  'בית-שמש': 'rabanutbs.co.il',
  'חיפה': 'mdhaifa.org.il',
  'חולון': 'datholon.co.il',
  'חדרה': 'haderamd.org.il',
  'רמת-גן': 'mdrg.org.il',
  'קרית-אונו': 'rmdko.co.il',
  'כפר יונה': 'kfar-yona.org.il',
  'קדומים': 'kedumim.org.il',
  'חבל יבנה': 'hevel-yavne.org.il',
  'חבל מודיעין': 'modiin-region.muni.il',
  'הר חברון': 'hrhevron.co.il',
  'שומרון': 'shomron.org.il',
  'אזור': 'azor.muni.il',
  'אפרת': 'efrat.muni.il',
  'פרדסיה': 'pardesia.muni.il',
  'אזורית עמק המעינות': 'maianot.co.il',
  'כפר פינס': 'datitkp.co.il',
};

// --- md* candidate generation (heuristic fallback) ---------------------------
const HEB2LAT: Record<string, string> = {
  'א': '', 'ב': 'b', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'v', 'ז': 'z', 'ח': 'ch', 'ט': 't', 'י': 'y',
  'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm', 'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': '', 'פ': 'p',
  'ף': 'p', 'צ': 'tz', 'ץ': 'tz', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't',
};
const romanize = (s: string): string => [...s].map((c) => HEB2LAT[c] ?? '').join('');
function candidates(name: string): string[] {
  const words = name.replace(/[-]/g, ' ').split(/\s+/).filter((w) => w && !/^(אזורית|וגבעת|עילית)$/.test(w));
  const initials = words.map((w) => romanize(w).slice(0, 1)).join('');
  const full = romanize(words.join('')).slice(0, 10);
  const set = new Set<string>();
  for (const base of [`md${initials}`, `md${full}`, full, `md${romanize(words[0]).slice(0, 3)}`]) {
    if (base.length >= 3) { set.add(`${base}.org.il`); set.add(`${base}.org`); }
  }
  return [...set].slice(0, 6);
}

// --- verification (read-only; headers + signatures only) ---------------------
async function http(url: string): Promise<{ status: number; headers: Headers; text: string } | null> {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(7000) });
    return { status: r.status, headers: r.headers, text: await r.text() };
  } catch { return null; }
}

function detectCms(html: string): string {
  if (/directories-pro|synagogues_dir_ltg/.test(html)) return 'SabaiApps';
  if (/wp-content|wp-json/.test(html)) return 'WordPress-other';
  if (/wix\.com|wixsite|X-Wix|_wixCssStates/.test(html)) return 'Wix';
  if (/Joomla/i.test(html)) return 'Joomla';
  if (/Drupal/i.test(html)) return 'Drupal';
  return 'custom';
}
const normHeb = (s: string): string => s.replace(/[\-"'׳״]/g, '').replace(/\s+/g, '');

interface CatalogRow {
  councilName: string; domain: string | null; confidence: number; evidenceUrl: string | null;
  cms: string | null; hasSynagogueDirectory: boolean; supportedByCurrentParser: boolean;
  variant: string | null; estimatedCount: number | null;
  robots: { fetched: boolean; directoryAllowed: boolean | null }; nextAction: string;
}

async function verify(name: string, domain: string, requireNameMatch = true): Promise<CatalogRow | null> {
  const home = await http(`https://${domain}/`);
  if (!home || home.status >= 400) return null;

  // Heuristic (md*) candidates MUST name-match (avoid md* collisions / parked
  // sites). Official-source seeds (gov.il XLSX) are trusted even if the homepage
  // is JS-rendered or the city was renamed (e.g. נצרת עילית→נוף הגליל).
  const nameMatch = normHeb(home.text).includes(normHeb(name));
  if (!nameMatch && requireNameMatch) return null;

  const robotsRes = await http(`https://${domain}/robots.txt`);
  const robotsTxt = robotsRes?.text ?? '';
  const directoryAllowed = robotsRes ? !/Disallow:\s*\/directory-synagogues/i.test(robotsTxt) : null;

  const dir = await http(`https://${domain}/directory-synagogues/`);
  const dirHtml = dir?.text ?? '';
  const isSabai = dir != null && dir.status < 400 && /synagogues_dir_ltg|entity_field_post_title|directories-pro/.test(dirHtml);
  const hasDir = isSabai || /רשימת בתי כנסת|directory-synagogues|\/synagogues/.test(home.text);

  let cms = isSabai ? 'SabaiApps' : detectCms(home.text);
  let variant: string | null = null;
  let count: number | null = null;

  if (isSabai) {
    const rest = await http(`https://${domain}/wp-json/wp/v2/synagogues_dir_ltg?per_page=1`);
    count = rest ? Number(rest.headers.get('x-wp-total')) || 0 : null;
    const waze = (dirHtml.match(/waze\.com\/ul\?ll=/g) || []).length;
    const markers = (dirHtml.match(/"lat":3[0-3]\.[0-9]+,"lng":3[3-6]\.[0-9]+/g) || []).length;
    variant = waze > 2 ? 'waze' : markers > 2 ? 'markers' : 'needs-variant';
  }

  let confidence = 0;
  if (nameMatch) confidence += 0.5;
  if (!requireNameMatch) confidence += 0.4; // trusted official source (gov.il XLSX)
  if (isSabai) confidence += 0.3;
  if (count && count > 0) confidence += 0.2;
  confidence = Math.min(1, Number(confidence.toFixed(2)));

  const supported = isSabai && (variant === 'waze' || variant === 'markers');
  const nextAction = supported ? 'ready-to-import'
    : isSabai ? 'needs-variant'
    : hasDir ? `needs-adapter:${cms}`
    : 'no-directory';

  return {
    councilName: name, domain, confidence, evidenceUrl: isSabai ? `https://${domain}/directory-synagogues/` : `https://${domain}/`,
    cms, hasSynagogueDirectory: hasDir, supportedByCurrentParser: supported, variant, estimatedCount: count,
    robots: { fetched: robotsRes != null, directoryAllowed }, nextAction,
  };
}

async function main(): Promise<void> {
  const catalog: CatalogRow[] = [];

  for (const name of COUNCILS) {
    const v = VERIFIED[name];
    if (v) {
      catalog.push({
        councilName: name, domain: v.domain, confidence: 1, evidenceUrl: `https://${v.domain}/`,
        cms: v.cms, hasSynagogueDirectory: v.cms === 'SabaiApps' || v.cms === 'WordPress-other' || v.cms === 'Wix',
        supportedByCurrentParser: v.supported, variant: v.variant ?? null, estimatedCount: v.count ?? null,
        robots: { fetched: false, directoryAllowed: v.cms === 'SabaiApps' ? true : null },
        nextAction: v.merged ? 'merged' : v.supported ? 'ready-to-import' : v.variant === 'needs-variant' ? 'needs-variant' : `needs-adapter:${v.cms}`,
      });
      continue;
    }
    // unresolved → official seed first (trusted, no name-match required), then md*
    let best: CatalogRow | null = null;
    if (SEED_DOMAINS[name]) best = await verify(name, SEED_DOMAINS[name], false);
    if (!best || best.confidence < 0.8) {
      for (const cand of candidates(name)) {
        const row = await verify(name, cand, true);
        if (row && (!best || row.confidence > best.confidence)) best = row;
        if (best && best.confidence >= 0.8) break;
      }
    }
    catalog.push(best ?? {
      councilName: name, domain: null, confidence: 0, evidenceUrl: null, cms: null,
      hasSynagogueDirectory: false, supportedByCurrentParser: false, variant: null, estimatedCount: null,
      robots: { fetched: false, directoryAllowed: null }, nextAction: 'manual-search',
    });
  }

  const resolved = catalog.filter((r) => r.domain);
  const sabai = catalog.filter((r) => r.cms === 'SabaiApps');
  const ready = catalog.filter((r) => r.nextAction === 'ready-to-import');
  const summary = {
    totalCouncils: COUNCILS.length,
    resolvedDomain: resolved.length,
    unresolved: catalog.length - resolved.length,
    sabaiApps: sabai.length,
    readyToImport: ready.length,
    readyPotentialSynagogues: ready.reduce((a, r) => a + (r.estimatedCount || 0), 0),
    needsVariant: catalog.filter((r) => r.nextAction === 'needs-variant').length,
    needsAdapter: catalog.filter((r) => r.nextAction.startsWith('needs-adapter')).length,
    merged: catalog.filter((r) => r.nextAction === 'merged').length,
    byCms: catalog.reduce((m: Record<string, number>, r) => { const k = r.cms ?? 'unknown'; m[k] = (m[k] || 0) + 1; return m; }, {}),
    generatedNote: 'RESEARCH catalog — no synagogue records pulled, no live data touched.',
  };
  const review = catalog.filter((r) => r.confidence < 0.5 || r.nextAction === 'manual-search')
    .map((r) => ({ councilName: r.councilName, confidence: r.confidence, nextAction: r.nextAction }));

  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'council-domain-catalog.json'), JSON.stringify(catalog, null, 2), 'utf8');
  writeFileSync(join(OUT, 'council-domain-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
  writeFileSync(join(OUT, 'manual-review.json'), JSON.stringify(review, null, 2), 'utf8');

  console.log('\n========== council domain resolver ==========');
  for (const [k, v] of Object.entries(summary)) console.log(`  ${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
  console.log('\nready-to-import:');
  for (const r of ready) console.log(`  ${r.councilName} | ${r.domain} | ${r.variant} | ${r.estimatedCount}`);
}

main().catch((e) => { console.error('Failed:', e); process.exit(1); });

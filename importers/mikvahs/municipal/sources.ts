/**
 * Source registry + column maps for the municipal "א.ש בינה" mikvah tables
 * (Phase 6). These are flat public HTML tables — NO native coordinates — so
 * downstream records are address/phone-keyed and stay un-geocoded.
 *
 * Discovery classified Modiin Illit, Maale Adumim and the Shomron regional
 * council as the same "א.ש בינה" CMS (one adapter family); Modi'in-Maccabim-Reut
 * is an ASP.NET sibling whose cells embed the column label (stripped on parse).
 *
 * DRY-RUN / ADDITIVE-ONLY: scraped read-only; nothing is written or merged.
 */

export type Gender = 'נשים' | 'גברים' | 'כלים';

/** Zero-based column indices for the roles a table exposes. */
export interface ColumnMap {
  settlement?: number;   // shomron: the settlement name doubles as the city
  neighborhood?: number;
  name?: number;
  address?: number;
  phone?: number;
  phone2?: number;
  balanit?: number;
  balanitDetails?: number;
  hoursWeek?: number;
  hoursFri?: number;
  hoursMotzash?: number;
  hours?: number;        // single combined hours column
}

export interface TableSpec {
  /** Index among the page's <table> elements (document order). */
  tableIndex: number;
  gender: Gender;
  map: ColumnMap;
  /** A word the header row must contain — asserts table alignment (warns if not). */
  headerHint?: string;
}

export interface MunicipalSource {
  id: string;
  municipality: string;
  /** Fixed city, OR (for regional councils) the row's settlement is the city. */
  city: string;
  regional?: boolean;
  domain: string;
  url: string;
  cms: 'asbina' | 'aspnet';
  tables: TableSpec[];
}

export const MUNICIPAL_SOURCES: MunicipalSource[] = [
  {
    id: 'modiin-illit',
    municipality: 'עיריית מודיעין עילית',
    city: 'מודיעין עילית',
    domain: 'modil.org.il',
    url: 'https://www.modil.org.il/רשימת-המקוואות/',
    cms: 'asbina',
    tables: [
      { tableIndex: 0, gender: 'נשים', headerHint: 'אחראית', map: { neighborhood: 0, address: 1, phone: 2, balanit: 3, balanitDetails: 4 } },
      { tableIndex: 1, gender: 'גברים', map: { neighborhood: 0, address: 1 } },
      { tableIndex: 2, gender: 'כלים', map: { neighborhood: 0, address: 1 } },
    ],
  },
  {
    id: 'maale-adumim',
    municipality: 'עיריית מעלה אדומים',
    city: 'מעלה אדומים',
    domain: 'maale-adummim.muni.il',
    url: 'https://maale-adummim.muni.il/מקוואות/',
    cms: 'asbina',
    tables: [
      { tableIndex: 0, gender: 'נשים', headerHint: 'כתובת', map: { neighborhood: 0, address: 1, phone: 2, hoursWeek: 3, hoursFri: 4, hoursMotzash: 5 } },
    ],
  },
  {
    id: 'shomron',
    municipality: 'המועצה האזורית שומרון',
    city: 'מועצה אזורית שומרון',
    regional: true,
    domain: 'shomron.org.il',
    url: 'https://www.shomron.org.il/379/',
    cms: 'asbina',
    tables: [
      { tableIndex: 0, gender: 'נשים', headerHint: 'בלנית', map: { settlement: 0, balanit: 1, phone: 2, phone2: 3, hoursWeek: 4, hoursFri: 5, hoursMotzash: 6 } },
    ],
  },
  {
    id: 'modiin-maccabim-reut',
    municipality: 'עיריית מודיעין-מכבים-רעות',
    city: 'מודיעין-מכבים-רעות',
    domain: 'modiin.muni.il',
    url: 'https://www.modiin.muni.il/ModiinWebSite/ArticlePage.aspx?PageID=145_374',
    cms: 'aspnet',
    tables: [
      // table 0 = vessels, table 1 = women (winter). table 2 (summer dup) and
      // table 3 (staff contact) are intentionally NOT mapped.
      { tableIndex: 0, gender: 'כלים', headerHint: 'מקווה', map: { name: 0, address: 1, phone: 2, hours: 3 } },
      { tableIndex: 1, gender: 'נשים', headerHint: 'סוג', map: { name: 0, address: 1, phone: 2, hoursWeek: 3, hoursFri: 4, hoursMotzash: 5 } },
    ],
  },
];

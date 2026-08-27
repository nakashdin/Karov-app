export const he = {
  appName: 'קרוב – כל מה שיהודי צריך, קרוב אליך',

  greeting: {
    shabbat: 'שבת שלום',
    weekday: 'שבוע טוב',
  },

  tabs: {
    home: 'בית',
    map: 'מפה',
    list: 'רשימה',
  },

  home: {
    title: 'קרוב',
    subtitle: 'כל מה שיהודי צריך, קרוב אליך',
    whatsAround: 'מה יש סביבי?',
    restaurants: 'מסעדות כשרות',
    synagogues: 'בתי כנסת',
    mikvahs: 'מקוואות',
    chabadHouses: 'בתי חב״ד',
    tzadikGraves: 'קברי צדיקים',
    favorites: 'מועדפים',
    nearbyTitle: 'קרובים אליך',
    seeAll: 'הצג הכל',
    locating: 'מאתר מיקום…',
    whatsAroundSubtitle: 'הצג מקומות קרובים למיקומך',
    homeSearchPlaceholder: 'חפש מסעדה, בית כנסת...',
  },

  favorites: {
    title: 'מועדפים',
    empty: 'אין עדיין מועדפים',
    emptyHint: 'הקש על הלב במסך של מקום כדי לשמור אותו כאן',
  },

  list: {
    title: 'מקומות כשרים',
    searchPlaceholder: 'חיפוש לפי שם או כתובת…',
    resultsCount: (n: number) => `${n} תוצאות`,
    sortByDistance: 'לפי מרחק',
    sortByName: 'לפי שם',
  },

  map: {
    title: 'מפה',
    recenter: 'מרכז אותי',
    fallbackTitle: 'תצוגת מפה',
    fallbackBody:
      'מנוע המפה (MapLibre) דורש בנייה מקומית (dev build) ואינו זמין ב‑Expo Go. בינתיים מוצגת רשימת המקומות עם המיקום שלהם.',
  },

  detail: {
    navigate: 'נווט',
    call: 'התקשר',
    report: 'דווח על טעות',
    address: 'כתובת',
    phone: 'טלפון',
    hours: 'שעות פתיחה',
    kosherType: 'סוג כשרות',
    foodType: 'סוג אוכל',
    nusach: 'נוסח',
    gender: 'סוג מקווה',
    attendant: 'בלן/בלנית',
    contactPerson: 'שליח / איש קשר',
    services: 'שירותים',
    website: 'אתר אינטרנט',
    source: 'מקור',
    certifiedBy: 'תעודת כשרות',
    validUntil: 'בתוקף עד',
    certExpired: 'תעודת כשרות פגה',
    attributedSource: 'מה שנמסר במקור',
    notVerifiedAgainstRegistry: 'לא אומת מול רשימת גופי הכשרות שלנו',
    // Owner ruling, 2026-08-27: was 'אומת לאחרונה' ("last verified") — a
    // false claim. 2,038 records share the exact same date because a
    // script ran that day, not because anyone verified 2,038 places in a
    // day. The field records when the database was last touched, not a
    // human verification event — the wording must say that, not remove the
    // row (removing it hides information rather than correcting a claim).
    lastVerified: 'עודכן במאגר',
    buriedPerson: 'קבור כאן',
    approxLocation: 'מיקום משוער לפי עיר',
    distanceAway: (text: string) => `${text} ממך`,
    notFound: 'המקום לא נמצא',
  },

  card: {
    details: 'לפרטים מלאים',
  },

  filters: {
    title: 'סינון',
    placeType: 'סוג מקום',
    city: 'עיר',
    kosherType: 'סוג כשרות',
    category: 'בשרי / חלבי / פרווה',
    all: 'הכל',
    apply: 'הצג תוצאות',
    clear: 'נקה',
    activeCount: (n: number) => (n > 0 ? `${n} פעילים` : ''),
  },

  report: {
    title: 'דיווח על מידע שגוי',
    intro: 'שמת לב שמשהו לא מדויק? ספר לנו ונתקן.',
    placeLabel: 'המקום',
    typeLabel: 'סוג הבעיה',
    types: {
      closed: 'המקום סגור / לא קיים',
      wrong_kosher: 'פרטי כשרות שגויים',
      wrong_details: 'כתובת / טלפון שגויים',
      other: 'אחר',
    },
    detailsLabel: 'פירוט (לא חובה)',
    detailsPlaceholder: 'תאר את הבעיה…',
    submit: 'שלח דיווח',
    submitting: 'שולח…',
    successTitle: 'תודה על הדיווח!',
    successBody: 'הדיווח התקבל ויטופל בהקדם.',
    errorTitle: 'אופס',
    errorBody: 'שליחת הדיווח נכשלה. נסה שוב.',
    back: 'חזרה',
  },

  category: {
    meat: 'בשרי',
    dairy: 'חלבי',
    parve: 'פרווה',
  },

  common: {
    loading: 'טוען…',
    error: 'משהו השתבש',
    retry: 'נסה שוב',
    empty: 'לא נמצאו מקומות',
    emptyHint: 'נסה לשנות את הסינון או החיפוש',
    close: 'סגור',
    cancel: 'ביטול',
    km: 'ק״מ',
    meters: 'מ׳',
  },

  permissions: {
    denied: 'הרשאת מיקום נדחתה',
    deniedHint: 'ניתן לאפשר מיקום בהגדרות המכשיר.',
  },

  cuisine: {
    coffee_shop: 'בית קפה',
    burger: 'בורגר',
    pizza: 'פיצה',
    street_food: 'מזון רחוב',
    sushi: 'סושי',
    meat: 'בשרים',
  },

  listCategories: {
    all: 'הכל',
    restaurant: 'מסעדות',
    synagogue: 'בתי כנסת',
    mikveh: 'מקוואות',
    chabad_house: 'בתי חב"ד',
    tzaddik_grave: 'קברי צדיקים',
  },

  // Sub-tabs inside the food ("לאכול") section. Every food type in
  // src/types/catalog.ts needs a label here, otherwise its records are
  // unreachable from the UI.
  foodCategories: {
    all: 'הכל',
    restaurant: 'מסעדות',
    chef_restaurant: 'מסעדות שף',
    cafe: 'בתי קפה',
    coffee_cart: 'עגלות קפה',
    fast_food: 'מזון מהיר',
    bakery: 'מאפיות',
    juice_bar: 'בתי מיץ',
    ice_cream_parlor: 'גלידריות',
    winery: 'יקבים',
  },

  about: {
    headerTitle: 'אודות קרוב',
    appName: 'קרוב',
    version: (v: string) => `גרסה ${v}`,
    missionTitle: 'המטרה שלנו',
    missionBody: 'קרוב נוצרה מתוך רצון לתרום למען הקהילה היהודית — לרכז את כל המקומות, השירותים והמידע היהודי במקום אחד נגיש, בכל מקום בעולם.',
    categoriesTitle: 'מה תמצאו באפליקציה',
    dailyBrachot: 'ברכות יומיות נבחרות',
    zmanim: 'זמני היום (זמנים הלכתיים)',
    parasha: 'פרשת השבוע',
    communityTitle: 'קהילה שבונה יחד',
    communityBody: 'קרוב מונעת על ידי הקהילה. כל אחד יכול להוסיף מיקום חדש או לדווח על מידע שגוי — כך אנחנו יחד ממקסמים את השירות ליהודים בכל רחבי העולם.',
    attributionTitle: 'מקורות ורישוי',
    attributionBody: 'חלק מנתוני המקומות והמפה מגיעים מ‑OpenStreetMap, ומופצים תחת רישיון ODbL. תודה לאלפי המתנדבים שממפים את ישראל.',
    osmLinkText: '© OpenStreetMap contributors — ODbL',
    osmLinkAccessibilityLabel: 'רישיון OpenStreetMap',
    sourcesLine: 'זמנים הלכתיים ולוח עברי: Hebcal · תוכן תורני: Sefaria · מקוואות: data.gov.il · בתי חב״ד: Chabad.org',
    footerText: 'עשוי באהבה לעם ישראל 🇮🇱',
  },

  menu: {
    title: 'תפריט',
    contact: 'צור קשר',
    donate: 'לתרומה',
    share: 'שתף את קרוב',
    about: 'אודות',
    language: 'שפה',
    shareMessage: 'קרוב – כל מה שיהודי צריך, קרוב אליך:',
  },
  errorBoundary: {
    title: 'משהו השתבש',
    body: 'אירעה תקלה בלתי צפויה. אפשר לנסות שוב — ואם זה חוזר, נשמח לדיווח.',
    retry: 'נסה שוב',
    retryLabel: 'נסה שוב',
  },

  // Descriptive kashrut phrases only — NOT certifying-body names. A body's
  // name (e.g. "בד״ץ בית יוסף", "צהר") is data from src/data/kashrut/
  // authorities.ts, never copy: authorities.ts's own header says nothing
  // else may hard-code a certifier name, and translating a proper noun
  // per-locale would fork identity across 5 files. This section is only the
  // words wrapped around a body/level fact — group labels, the unverified-
  // claim framing, and the no-evidence floor (Item 4 Unit 3, 2026-08-27).
  kosher: {
    rabbinate: 'רבנות',
    rabbinateMehadrin: 'רבנות מהדרין',
    badatzGeneric: 'בד״ץ',
    mehadrinGeneric: 'מהדרין',
    glattGeneric: 'גלאט',
    kosherGeneric: 'כשר',
    // Owner ruling, verbatim: "אם לא ידוע יש להציג כשר כשרות מקומית" —
    // supersedes the earlier Batch B1 floor string 'גוף כשרות לא ידוע' (see
    // docs/KASHRUT_FACTS.md), which read as a warning ("we don't know who
    // certifies this") rather than the owner's intended statement ("this is
    // kosher, under local supervision").
    unknownFloor: 'כשר כשרות מקומית',
    // The source states this level but names no certifying body Karov can
    // verify — an unverified CLAIM, never presented as equivalent to a
    // verified level. claimedLevelText carries the source's own verbatim
    // wording alongside this framing, never merged into one phrase with a
    // body name (owner ruling: a body and a level are different kashruts).
    claimedLevelPrefix: 'טוען לכשרות:',
  },
} as const;

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
    lastVerified: 'אומת לאחרונה',
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
} as const;

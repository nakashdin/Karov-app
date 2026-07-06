/**
 * All user-facing Hebrew strings live here.
 * Centralizing them keeps screens clean and makes a future i18n library swap trivial.
 */
export const he = {
  appName: 'קרוב – כל מה שיהודי צריך, קרוב אליך',

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
    navigate: 'נווט ב‑Waze',
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
} as const;

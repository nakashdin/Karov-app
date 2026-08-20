import { elulCardText, elulDetails, getElulState } from './selichot';

export interface JewishStaticEvent {
  title: string;
  body: string;
  /** Long-form paragraphs, shown only in the modal (not on the card) */
  details?: string[];
  category: 'hilula' | 'historical' | 'special';
}

/**
 * Static Jewish calendar events keyed by "HebrewMonth_Day"
 * Month names match Hebcal API: Nisan, Iyyar, Sivan, Tamuz, Av, Elul,
 * Tishrei, Cheshvan, Kislev, Tevet, Shevat, Adar, "Adar I", "Adar II"
 */
export const JEWISH_STATIC_EVENTS: Record<string, JewishStaticEvent[]> = {
  // ─── Tishrei ───────────────────────────────────────────────
  'Tishrei_21': [{
    title: 'הושענא רבה',
    body: 'יום האחרון של חג הסוכות — חתימת הדין של ראש השנה. נוהגים להקיף שבע הקפות ולהכות חמישה ערבות.',
    category: 'special',
  }],

  // ─── Cheshvan ──────────────────────────────────────────────
  'Cheshvan_11': [
    {
      title: 'הילולת רחל אמנו',
      body: 'יום פטירת רחל אמנו — "קול ברמה נשמע, נהי בכי תמרורים, רחל מבכה על בניה". אלפים עולים לקברה בבית לחם.',
      category: 'hilula',
    },
    {
      title: 'הסתלקות הרבי מהר״ש',
      body: 'הסתלקות ר׳ שמואל שניאורסאהן (האדמו״ר המהר״ש) מלובביץ׳, בנו הרביעי של בעל התניא, תרמ״ב.',
      category: 'hilula',
    },
  ],

  // ─── Kislev ────────────────────────────────────────────────
  'Kislev_10': [{
    title: 'הילולת הברדיטשבר',
    body: 'הסתלקות ר׳ לוי יצחק מברדיטשב — ״סנגורם של ישראל״, מחבר ׳קדושת לוי׳, תקס״ב.',
    category: 'hilula',
  }],
  'Kislev_19': [{
    title: 'י״ט כסלו — חג הגאולה',
    body: 'יום שחרורו של האדמו״ר הזקן בעל התניא מהכלא בפטרסבורג, תקנ״ח. ראש השנה של החסידות.',
    category: 'special',
  }],
  'Kislev_20': [{
    title: 'כ׳ כסלו — יום ב׳ של חג הגאולה',
    body: 'המשך חג הגאולה. ביום זה נשלחה הידיעה על שחרורו של האדמו״ר הזקן.',
    category: 'special',
  }],

  // ─── Tevet ─────────────────────────────────────────────────
  'Tevet_20': [{
    title: 'הילולת הרמב״ם',
    body: 'יום פטירת רבי משה בן מיימון — הרמב״ם, בעל ״משנה תורה״ ו״מורה נבוכים״, כ׳ טבת ד׳תתקס״ה. קבור בטבריה.',
    category: 'hilula',
  }],
  'Tevet_24': [{
    title: 'הסתלקות בעל התניא',
    body: 'הסתלקות ר׳ שניאור זלמן מלאדי — בעל התניא, מייסד חסידות חב״ד, כ״ד טבת תקע״ג.',
    category: 'hilula',
  }],

  // ─── Shevat ────────────────────────────────────────────────
  'Shevat_4': [{
    title: 'הילולת הבאבא סאלי',
    body: 'יום פטירת רבי ישראל אבוחצירא — הבאבא סאלי, ד׳ שבט תשמ״ד. קבור בנתיבות. מאות אלפים עולים לקברו.',
    category: 'hilula',
  }],
  'Shevat_24': [{
    title: 'הסתלקות הגרמ״פ',
    body: 'הסתלקות ר׳ משה פיינשטיין זצ״ל, פוסק הדור בארצות הברית, י״ד אדר תשמ״ו (נפטר בשבט לפי לוח אחר).',
    category: 'hilula',
  }],

  // ─── Adar (regular year) ────────────────────────────────────
  'Adar_7': [{
    title: 'ז׳ אדר — יום הולדת ויום פטירת משה רבנו',
    body: 'ביום ז׳ אדר נולד ובו נפטר משה רבנו — ״ויהי שם עם ה׳ ארבעים יום״. נוהגים בתענית (חברא קדישא).',
    category: 'special',
  }],
  'Adar I_7': [{
    title: 'ז׳ אדר א׳ — שנה מעוברת',
    body: 'בשנה מעוברת, חלק נוהגים תענית ז׳ אדר (יום הולדת ופטירת משה רבנו) באדר ראשון.',
    category: 'special',
  }],
  'Adar II_7': [{
    title: 'ז׳ אדר ב׳ — יום הולדת ויום פטירת משה רבנו',
    body: 'ביום ז׳ אדר נולד ובו נפטר משה רבנו. בשנה מעוברת — נוהגים ביום זה באדר שני.',
    category: 'special',
  }],
  'Adar I_14': [{
    title: 'פורים קטן',
    body: 'בשנה מעוברת, י״ד אדר א׳ נקרא ״פורים קטן״. אין אמירת תחנון ויש מקצת שמחה.',
    category: 'special',
  }],
  'Adar I_15': [{
    title: 'שושן פורים קטן',
    body: 'ט״ו אדר א׳ בשנה מעוברת — ״שושן פורים קטן״. ממעטים בהספד ותענית.',
    category: 'special',
  }],

  // ─── Nisan ─────────────────────────────────────────────────
  'Nisan_11': [
    {
      title: 'י״א ניסן — יום הולדת הרבי מלובביץ׳',
      body: 'יום הולדת ר׳ מנחם מנדל שניאורסאהן — הרבי מלובביץ׳, בשנת תר״ב (1902).',
      category: 'special',
    },
    {
      title: 'הילולת השל״ה הקדוש',
      body: 'יום פטירת רבי ישעיהו הורוויץ — בעל ״שני לוחות הברית״ (השל״ה הקדוש), י״א ניסן שפ״ה. קבור בטבריה.',
      category: 'hilula',
    },
  ],
  'Nisan_26': [{
    title: 'הילולת יהושע בן נון',
    body: 'יום פטירת יהושע בן נון — מנהיג ישראל בכניסה לארץ כנען וכיבושה, כ״ו ניסן. קבור בתמנת חרס (תמנת סרח).',
    category: 'hilula',
  }],
  'Nisan_14': [{
    title: 'ערב פסח',
    body: 'בדיקת חמץ (י״ג בלילה), ביעור חמץ, תענית בכורות ועיסוק בתורה — ערב חג הפסח.',
    category: 'special',
  }],

  // ─── Iyyar ─────────────────────────────────────────────────
  'Iyyar_14': [
    {
      title: 'פסח שני',
      body: 'פסח שני — הזדמנות שניה לאלה שנטמאו או היו בדרך רחוקה ולא הקריבו קרבן פסח. ״אף פעם לא מאוחר מדי״.',
      category: 'special',
    },
    {
      title: 'הילולת ר׳ מאיר בעל הנס',
      body: 'יום הסתלקות ר׳ מאיר — תלמיד רבי עקיבא, מגדולי התנאים. קברו בטבריה — אלפים עולים לשם ביום זה לבקש ישועות.',
      category: 'hilula',
    },
  ],
  'Iyyar_18': [{
    title: 'לג בעומר — הילולת רשב״י',
    body: 'יום הסתלקות ר׳ שמעון בר יוחאי, מחבר הזוהר. יום של שמחה, בונפירות ותספורת לילדים (חלאקה).',
    category: 'hilula',
  }],
  'Iyyar_26': [{
    title: 'הילולת הרמח״ל',
    body: 'יום פטירת רבי משה חיים לוצאטו — הרמח״ל, בעל ״מסילת ישרים״ ו״דרך ה׳״, כ״ו אייר תק״ז. קבור בטבריה.',
    category: 'hilula',
  }],
  'Iyyar_28': [{
    title: 'הילולת שמואל הנביא',
    body: 'יום פטירת שמואל הנביא — שופט ישראל, שמשח את שאול ואת דוד למלכים, כ״ח אייר. קבור ברמה (נבי סמואל).',
    category: 'hilula',
  }],

  // ─── Sivan ─────────────────────────────────────────────────
  'Sivan_5': [{
    title: 'ערב שבועות',
    body: 'ערב חג מתן תורה. נוהגים ללמוד כל הלילה (תיקון ליל שבועות) ולהתארות לקבלת התורה.',
    category: 'special',
  }],

  // ─── Tamuz ─────────────────────────────────────────────────
  'Tamuz_3': [{
    title: 'הסתלקות הרבי מלובביץ׳',
    body: 'הסתלקות ר׳ מנחם מנדל שניאורסאהן — הרבי מלובביץ׳, ג׳ תמוז תשנ״ד (1994).',
    category: 'hilula',
  }],
  'Tamuz_26': [{
    title: 'הילולת יונתן בן עוזיאל',
    body: 'יום פטירת יונתן בן עוזיאל — תלמיד הלל הזקן ומחבר תרגום יונתן לנביאים, כ״ו תמוז. קבור בעמוקה שבגליל.',
    category: 'hilula',
  }],

  // ─── Av ────────────────────────────────────────────────────
  'Av_5': [{
    title: 'הילולת האר״י הקדוש',
    body: 'יום פטירת רבי יצחק לוריא — האר״י הקדוש, אבי הקבלה הלוריאנית, ה׳ אב של״ב. קבור בבית הקברות האר״י בצפת.',
    category: 'hilula',
  }],
  'Av_1': [{
    title: 'ראש חודש אב — תחילת תשעת הימים',
    body: 'מתחילים ״תשעת הימים״ — ימי אבלות על חורבן בית המקדש. ממעטים בשמחה, בבשר ובייין ובכביסה.',
    category: 'special',
  }],
  'Av_15': [{
    title: 'ט״ו באב',
    body: '״לא היו ימים טובים לישראל כחמישה עשר באב וכיום הכיפורים״ (תענית ל:). יום שמחה ואהבה.',
    category: 'special',
  }],

  // ─── Elul ──────────────────────────────────────────────────
  'Elul_18': [{
    title: 'חי אלול',
    body: 'יום הולדת הבעל שם טוב (תנ״ח / 1698) ויום הולדת האדמו״ר הזקן (תצ״ה / 1745). ״ניצוץ חיות״ בחודש אלול.',
    category: 'special',
  }],
};

/**
 * A stretch of days that carries its own meaning (Elul, the Ten Days of
 * Repentance). Unlike JEWISH_STATIC_EVENTS these are not a single date, so they
 * are matched by a Hebrew-month day range — and their text is resolved per day,
 * since what is true on 2 Elul is not true on Shabbat or on Erev Rosh Hashana.
 */
export interface JewishPeriodContext {
  /** Hebrew day of month */
  hebrewDay: number;
  /** Weekday, 0 = Sunday */
  weekday: number;
}

export interface JewishPeriod {
  id: string;
  /** Hebcal Hebrew month name */
  month: string;
  /** Inclusive Hebrew day range */
  fromDay: number;
  toDay: number;
  resolve(ctx: JewishPeriodContext): { title: string; body: string; details: string[] };
}

function resolveElul(month: string) {
  return (ctx: JewishPeriodContext) => {
    // 30 Av is the first of the two Rosh Chodesh Elul days — day 0.
    const elulDay = month === 'Av' ? 0 : ctx.hebrewDay;
    const state = getElulState(elulDay, ctx.weekday);
    return { ...elulCardText(state), details: elulDetails(state) };
  };
}

export const JEWISH_PERIODS: JewishPeriod[] = [
  { id: 'elul-rc', month: 'Av', fromDay: 30, toDay: 30, resolve: resolveElul('Av') },
  { id: 'elul', month: 'Elul', fromDay: 1, toDay: 29, resolve: resolveElul('Elul') },
  {
    id: 'aseret-yemei-teshuva',
    month: 'Tishrei',
    fromDay: 1,
    toDay: 10,
    resolve: () => ({
      title: 'עשרת ימי תשובה',
      body: 'מראש השנה ועד יום הכיפורים — חתימתם של ארבעים ימי הרחמים שהחלו בראש חודש אלול.',
      details: [
        'עשרת ימי תשובה הם עשרת הימים האחרונים מתוך ארבעים ימי הרצון שהחלו בראש חודש אלול, ובהם נחתם הדין שנפתח בראש השנה.',
        'ממשיכים באמירת סליחות עד ערב יום הכיפורים. בשבת שביניהם — שבת שובה — קוראים בהפטרה ״שובה ישראל עד ה׳ אלוקיך״.',
      ],
    }),
  },
];

/** All periods that contain the given Hebrew date. */
export function getJewishPeriods(month: string, day: number): JewishPeriod[] {
  if (!month || !day) return [];
  return JEWISH_PERIODS.filter(
    (p) => p.month === month && day >= p.fromDay && day <= p.toDay,
  );
}

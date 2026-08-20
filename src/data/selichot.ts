import { numToHebrew } from './tehillim';
import type { DetailBlock } from './jewishEvents';

/**
 * Elul / Selichot text for a given day.
 *
 * Everything here is derived from two facts we already have: which day of Elul
 * it is, and what weekday that is. Elul is always 29 days, so the rest of the
 * month — including when Rosh Hashana falls — follows from those.
 *
 * Day numbering: Av has 30 days, so Rosh Chodesh Elul spans two days —
 * 30 Av and 1 Elul. We call 30 Av "day 0" so the month is one continuous
 * range, and day 30 is Rosh Hashana itself.
 */

const ELUL_LENGTH = 29;
const ROSH_HASHANA_DAY = ELUL_LENGTH + 1; // 30, in "elul day" numbering
const SHABBAT = 6;

export interface ElulState {
  /** 0 = 30 Av (first day of Rosh Chodesh Elul), 1..29 = Elul proper */
  elulDay: number;
  /** Weekday of this day, 0 = Sunday */
  weekday: number;
  /** Days from this day until Rosh Hashana (29 Elul → 1) */
  daysToRoshHashana: number;
  /** Elul day on which Selichot begin */
  start: number;
}

/**
 * @param elulDay  0 for 30 Av, 1..29 for Elul
 * @param weekday  weekday of that day, 0 = Sunday
 */
export function getElulState(elulDay: number, weekday: number): ElulState {
  // Selichot begin on 2 Elul, the day after Rosh Chodesh. When that falls on
  // Shabbat the start moves to the Sunday after it.
  const secondOfElulWeekday = (((weekday + (2 - elulDay)) % 7) + 7) % 7;
  const start = secondOfElulWeekday === SHABBAT ? 3 : 2;

  return {
    elulDay,
    weekday,
    daysToRoshHashana: ROSH_HASHANA_DAY - elulDay,
    start,
  };
}

/** "ז׳ באלול", and "ראש חודש אלול" for the two days it spans. */
function hebrewDateLabel(elulDay: number): string {
  if (elulDay <= 1) return 'ראש חודש אלול';
  return `${numToHebrew(elulDay)} באלול`;
}

function inDays(n: number): string {
  if (n === 1) return 'מחר';
  if (n === 2) return 'מחרתיים';
  return `בעוד ${n} ימים`;
}

function daysLeft(n: number): string {
  if (n === 1) return 'עוד יום';
  if (n === 2) return 'עוד יומיים';
  return `עוד ${n} ימים`;
}

export interface ElulCardText {
  title: string;
  body: string;
}

/** The short, day-specific text on the "היום ביהדות" card. */
export function elulCardText(state: ElulState): ElulCardText {
  const { elulDay, weekday, daysToRoshHashana, start } = state;
  const title = 'ימי הרחמים והסליחות';
  const date = hebrewDateLabel(elulDay);
  const started = elulDay >= start;

  // No Selichot and no shofar on Shabbat.
  if (weekday === SHABBAT) {
    return {
      title,
      body: started
        ? `${date}, שבת — אין אומרים סליחות ואין תוקעים בשופר. הסליחות חוזרות מחר.`
        : `${date}, שבת. הסליחות מתחילות מחר.`,
    };
  }

  // Erev Rosh Hashana — the one day of Elul with no shofar.
  if (elulDay === ELUL_LENGTH) {
    return {
      title,
      body: `${date}, ערב ראש השנה. אומרים סליחות, ואין תוקעים בשופר — כדי להפסיק בין תקיעות הרשות של אלול לתקיעות החובה של ראש השנה.`,
    };
  }

  if (!started) {
    return {
      title,
      body: `${date}. הסליחות מתחילות ${inDays(start - elulDay)}${
        elulDay >= 1 ? ', ומהיום תוקעים בשופר אחרי שחרית' : ''
      }.`,
    };
  }

  return {
    title,
    body: `${date} — אומרים סליחות ותוקעים בשופר אחרי שחרית. ${daysLeft(daysToRoshHashana)} לראש השנה.`,
  };
}


/**
 * The longer read, shown when the card is tapped: what the month's name means,
 * where the days came from, and what we do in them.
 */
export function elulDetails(state: ElulState): DetailBlock[] {
  const startLabel = `${numToHebrew(state.start)} באלול`;

  return [
    {
      text: 'חודש אֱלוּל — ראשי תיבות של ״אֲנִי לְדוֹדִי וְדוֹדִי לִי״ (שיר השירים ו, ג). ״דודי״ הוא הקדוש ברוך הוא, ו״אני״ הוא עם ישראל.',
    },
    {
      text: 'בחודש אלול מתקיים הפסוק — שאנו לה׳, וה׳ לנו. כלומר, ישנה קרבה מיוחדת בין עם ישראל לה׳ בימי הרחמים והסליחות.',
    },
    {
      text: 'אך זאת בתנאי שאנו נעשה את הצעד הראשון ונקרב את עצמנו אליו — ״אֲנִי לְדוֹדִי״ — והוא יתקרב אלינו בחזרה — ״וְדוֹדִי לִי״. וכך אומר הקדוש ברוך הוא לישראל: ״שׁוּבוּ אֵלַי וְאָשׁוּבָה אֲלֵיכֶם״ (מלאכי ג, ז).',
    },
    {
      text: 'ובמידת הרחמים השולטת בימים הללו, הוא ממהר לסלוח ולרחם על ברואיו השבים אליו.',
    },

    {
      heading: 'מאיפה הגיעו ימי הרחמים והסליחות?',
      text: 'משה רבנו עלה להר סיני לארבעים יום, וכשירד וראה את העם בחטא העגל — שבר את לוחות הברית. הקדוש ברוך הוא ביקש לגזור גזרה על עם ישראל, ומשה עמד במסירות נפש ופנה אליו בתפילה. את התיקון עשה בעם בעצמו: העניש את החוטאים, ועורר את השאר לשוב בתשובה על שלא מיחו בידי החוטאים. אף על פי כן, עדיין היה העם נזוף.',
    },
    {
      text: 'לאחר מכן, בראש חודש אלול, עלה משה רבנו להר בשנית לארבעים יום נוספים — מא׳ באלול ועד יום הכיפורים. אלו היו הימים שבהם כבר סלח הקדוש ברוך הוא ומחל לעם ישראל, וציווה את משה לפסול לוחות שניים. ביום הכיפורים ירד משה מן ההר והודיע לישראל שעוונם נמחל. וכאות לכך שהשכינה אכן שורה בישראל — נצטווינו על הקמת המשכן.',
    },

    {
      heading: 'חשבון נפש',
      text: 'בחודש אלול עלינו לעצור ולבדוק את מצבנו על ידי עריכת ״חשבון נפש״ — בדיוק כפי שבעל עסק עורך בדיקה מדי שנה ובודק אם הרוויח או הפסיד. עלינו לבדוק את הדברים הטובים שעשינו, ולהתעכב על הדברים שעלינו לתקן. מוסיפים בהחלטות טובות, בלימוד התורה, בתפילה ובנתינת צדקה.',
    },

    {
      heading: 'תקיעת שופר',
      text: 'נוהגים לתקוע בשופר לאחר תפילת שחרית בכל יום, החל מראש חודש אלול. הסיבה היא שקולו מעורר ומרעיד את לב השומעים וגורם לחשבון נפש. שורש המילה שופר הוא ש.פ.ר, ובו רמוזה הבקשה של ה׳ אלינו בתקיעת השופר — שַׁפְּרוּ מעשיכם.',
    },
    {
      text: 'בערב ראש השנה אין תוקעים, כדי להפסיק בין תקיעות הרשות של אלול לתקיעות החובה של ראש השנה. גם בשבתות אין תוקעים.',
    },

    {
      heading: 'סליחות',
      text: 'נוהגים לומר את תפילת ״הסליחות״, הכוללת קטעי תפילה, פיוטים והזכרת שלוש עשרה מידות הרחמים. מטרתן לעורר את הלב לתשובה שלמה ולבקש סליחה מה׳.',
    },
    {
      text: `זמן ההתחלה חלוק במנהגים: הספרדים ובני עדות המזרח מתחילים בתחילת חודש אלול — למחרת ראש חודש, וכשהיום הזה חל בשבת מתחילים ביום ראשון שלאחריו; השנה יוצא ${startLabel}. בני אשכנז מתחילים במוצאי השבת שלפני ראש השנה, ואם ראש השנה חל בימי שני או שלישי מקדימים לשבוע שלפני כן — כדי שיהיו לפחות ארבעה ימי סליחות.`,
    },
    {
      text: 'בשבתות אין אומרים סליחות. הן נאמרות לאורך ארבעים ימי הרצון, ובכללם עשרת ימי תשובה — ובפועל יוצאים כשלושים ושישה ימי אמירה. יש הנוהגים לומר אותן בחצות הלילה, ויש בשעות הבוקר המוקדמות שלפני שחרית.',
    },
  ];
}

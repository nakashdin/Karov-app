import { numToHebrew } from './tehillim';

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

/** The longer read, shown when the card is tapped. */
export function elulDetails(state: ElulState): string[] {
  return [
    'ארבעים הימים שמראש חודש אלול ועד יום הכיפורים הם ימי רחמים ורצון, ובהם אומרים סליחות ותוקעים בשופר.',

    `מתי מתחילים: ספרדים ובני עדות המזרח מתחילים בב׳ באלול, למחרת ראש חודש, ואומרים סליחות עד ערב יום הכיפורים — וכשב׳ באלול חל בשבת מתחילים ביום ראשון שלאחריו. השנה יוצא ${numToHebrew(
      state.start,
    )} באלול. בני אשכנז מתחילים סמוך יותר לראש השנה, במוצאי השבת שלפניו.`,

    'בשבתות אין אומרים סליחות. הן נאמרות לאורך ארבעים ימי הרצון, ובכללם עשרת ימי תשובה — ובפועל יוצאים כשלושים ושישה ימי אמירה. יש הנוהגים לומר אותן בחצות הלילה, ויש בשעות הבוקר המוקדמות שלפני שחרית.',

    'שופר: תוקעים בכל יום אחרי תפילת שחרית, מא׳ באלול ואילך. בערב ראש השנה אין תוקעים — כדי להפסיק בין תקיעות הרשות של אלול לתקיעות החובה של ראש השנה.',

    'למה ארבעים יום? על פי המסורת עלה משה רבנו להר סיני שלוש פעמים, ארבעים יום בכל פעם. בראשונה קיבל את הלוחות הראשונים, וכשירד וראה את העם בחטא העגל — שברם. בשנייה עמד במסירות נפש בתפילה על ישראל ועשה את התיקון בעם עצמו: העניש את החוטאים ועורר את השאר לשוב בתשובה על שלא מיחו בידיהם, אך עדיין היה העם נזוף. בשלישית, שהחלה בראש חודש אלול, נתרצה הקדוש ברוך הוא: ציווה לפסול לוחות שניים, ובעשרה בתשרי — יום הכיפורים — ירד משה והודיע שעוונם נמחל. וכאות לכך שהשכינה שבה לשרות בישראל, נצטוו על הקמת המשכן.',
  ];
}

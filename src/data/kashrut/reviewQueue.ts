/**
 * Raw certifiedBy strings the kashrut authority registry has explicitly
 * deferred to human review — a string that names something (a level, a
 * possibly-nonexistent body, or two real bodies our single-value schema
 * can't hold) that could not be resolved to one specific registered
 * authority with confidence. Mirrors scripts/reports/kashrut-registry.json's
 * reviewQueue[].raw exactly, the same way authorities.ts mirrors
 * authorities[] — regenerate by hand from the registry if it changes.
 *
 * Not a judgment on the business: deferred means our registry hasn't
 * resolved the string, not that the string is wrong. See
 * isReviewQueueDeferred() for the one place this is meant to be read.
 */
export const REVIEW_QUEUE_RAWS: ReadonlySet<string> = new Set([
  "כשר בד\"ץ בית יוסף",
  "בד\"ץ מהדרין ירושלים",
  "בד\"צ בית ישראל, העדה החרדית",
  "בד\"ץ קהילות קריית ספר",
  "חלב ישראל",
  "בד\"ץ מהדרין — ועד הרבנים",
  "בד\"ץ העדה החרדית + בית יוסף",
  "רבנות מטה בנימין + בית יוסף + הרב לנדא",
  "מכון אונגר + רבנות מטה בנימין",
  "רב גרליצקי",
  "בד\"ץ העדה החרדית ורבנות מודיעין עילית",
  "הרב דיסקין",
  "בד\"ץ בית יוסף / רבנות מהדרין",
  "בד\"ץ ביתר / מהדרין",
  "כשר בהשגחת רבנות אריאל",
  "בד\"ץ יורה דעה",
  "רבנות מודיעין",
  "רב רפאל מנת",
  "כשר חלבי",
  "רבנות ירושלים / בד\"צ קהילות",
  "בד\"ץ בית שמש",
  "המועצה המקומית",
  "מועצה אזורית עמק יזרעאל",
  "בד\"ץ בית יוסף + רבנות הר חברון",
  "בד\"ץ מחזיקי הדת (בעלז) + בית יוסף",
  "בד\"ץ העדה החרדית + רבנות מטה יהודה",
  "ברכות אליהו",
  "רבנות מודיעין מהדרין ובד\"ץ בית יוסף",
  "רבנות ב\"ש מהדרין",
  "כשר בהשגחת הרבנות הראשית",
  "בד\"ץ יורה דעה הרב מחפוד",
  "חתם סופר",
  "בד״צ חתם סופר",
  "OU + רבנות גליל עליון + בית דין יורה דעה",
  "בד\"ץ בית יוסף + OK",
  "הרב אליעזר מלמד + OK",
  "קהילות",
  "ברכת אליהו",
  "בד\"ץ עדה חרדית ובד\"ץ בית יוסף",
  "בד\"ץ בית יוסף ובהשגחת הרב מחפוד",
  "רבנות ב\"ש",
  "הרב בנימין כהן",
  "הרב הנדל",
  "בד\"ץ קהילות",
  "הרב רפאל מנת",
  "רבנות ירושלים ובד\"צ העדה החרדית",
  "חתם סופר פתח תקווה",
  "רבנות ענב",
  "ראש העין",
  "בד\"צ חולון",
  "בד\"ץ יורה דעה + OUP",
  "OK + עדה חרדית + רבנות מטה בנימין",
  "בד\"ץ ירושלים",
  "בד\"ץ קהילות ורבנות ירושלים מהדרין",
  "רבנות יפו",
  "בד\"ץ אגודת ישראל והרבנות המקומית",
  "בד\"ץ קרית ספר / מהדרין",
  "רבני הקריות",
]);

/** Whether a place's raw certifiedBy text is deferred to human review — i.e.
 *  not verified against the authority registry, positive or negative. */
export function isReviewQueueDeferred(certifiedBy: string | undefined | null): boolean {
  return !!certifiedBy && REVIEW_QUEUE_RAWS.has(certifiedBy);
}

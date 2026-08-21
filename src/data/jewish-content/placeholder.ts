import { JewishContentItem } from './types';

// UI development placeholders only — do NOT ship to production.
// Replace entirely with source-verified content items before launch.
// Never set isPlaceholder: true on real content.
export type PlaceholderItem = JewishContentItem & { isPlaceholder: true };

export const PLACEHOLDER_CONTENT: PlaceholderItem[] = [
  {
    id: 'ph-bitachon-01',
    contentType: 'mussar',
    topics: ['bitachon', 'emunah'],
    title: 'ביטחון בה׳',
    karovSummary:
      'אחד מיסודות הביטחון הוא להבין שלא הכול נמצא בשליטתנו, ושה׳ מנהל את העולם בחסד ובחכמה.',
    karovExplanation:
      'חובות הלבבות מלמד שהביטחון האמיתי אינו שלילת ההשתדלות — אלא הבנה שמאמצינו הם הכלי, אך התוצאה בידי ה׳. כשמבינים זאת, פועלים מתוך שלווה ולא מתוך פחד. האדם המאמין יכול להשתדל בשלמות ולהרגיש חופשי בתוך אי-הוודאות, כי הוא יודע שאינו לבד.',
    dailyTakeaway:
      'היום, בעת קושי, שאל: האם עשיתי את שבידי? אם כן — החזר את השאר לה׳ ושחרר את הדאגה.',
    source: {
      work: { title: 'חובות הלבבות', author: 'רבינו בחיי אבן פקודה' },
      reference: 'שער הביטחון, פרק ג׳',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-middot-01',
    contentType: 'mussar',
    topics: ['middot', 'ben_adam_lachavero'],
    title: 'לדון לכף זכות',
    karovSummary:
      'לפני שאנחנו שופטים מישהו, חייבים לנסות להבין את המצב שלו ממקומו — לא ממקומנו.',
    karovExplanation:
      'פרקי אבות מלמדים "הוי דן את כל האדם לכף זכות". זה לא אומר לסלוח על הכל — זה אומר לתת לאחר את אותה נדיבות הפרשנות שהיינו רוצים שייתנו לנו. כשמניחים כוונות טובות לפני כוונות רעות, היחסים נהיים חמים יותר ושלווים יותר.',
    dailyTakeaway:
      'הפעם הבאה שמישהו יאכזב אותך, שאל: "האם יש לו סיבה שאני לא רואה?" גם אם לא — השאלה הזו תשנה את הרגשתך.',
    source: {
      work: { title: 'פרקי אבות' },
      reference: 'פרק א׳, משנה ו׳',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-tefilla-01',
    contentType: 'thought',
    topics: ['tefilla', 'emunah'],
    title: 'תפילה מתוך ביטחון',
    karovSummary:
      'תפילה אינה רק בקשה — היא שיחה. ברגע שאנחנו פונים לה׳, אנחנו מזכירים לעצמנו שאיננו לבד.',
    karovExplanation:
      'שערי תשובה מלמד שתפילה היא גשר בין עולמנו לבין הקדוש ברוך הוא. אפילו כשהתפילה לא נענית בדרך שציפינו — המעשה עצמו של הפנייה משנה אותנו. אנחנו מזכירים לעצמנו שיש כוח גדול מאיתנו, שדואג לנו.',
    dailyTakeaway:
      'לפני שתתחיל את היום, פנה למשהו קצר לה׳ — אפילו משפט אחד. לא חייב להיות שלם. זו גם תפילה.',
    source: {
      work: { title: 'שערי תשובה', author: 'רבינו יונה מגירונדי' },
      reference: 'שער ב׳',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-simcha-01',
    contentType: 'mussar',
    topics: ['simcha', 'hakarat_hatov'],
    title: 'לראות את הטוב',
    karovSummary:
      'שמחה אמיתית לא תלויה בנסיבות — היא תלויה ביכולת שלנו לזהות את הטוב שכבר קיים.',
    karovExplanation:
      'מסילת ישרים מלמד שהמחשבה קודמת לרגש. כשמשנים את מה שמחפשים, משנים מה שרואים. האדם שמתרגל לשאול "מה טוב היה היום?" — בונה בהדרגה עין שרואה ברכה גם במקומות שנראו ריקים.',
    dailyTakeaway:
      'לפני השינה, ספור שלושה דברים קטנים שהיו טובים היום. לא חייבים להיות גדולים.',
    source: {
      work: { title: 'מסילת ישרים', author: 'רבי משה חיים לוצאטו' },
      reference: 'פרק ז׳',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-emunah-01',
    contentType: 'mussar',
    topics: ['emunah', 'yirat_shamayim'],
    title: 'כשה׳ מנהל — אנחנו שלווים',
    karovSummary:
      'אמונה אמיתית היא לא רק אמירה — היא תחושה פנימית שאיננו לבד, שיש מי שמנהל ורואה.',
    karovExplanation:
      'מי שמאמין שה׳ מנהל את עולמו לא פירושו שהוא פסיבי — אלא שהוא פועל בשלווה. האמונה נותנת בסיס יציב מתחת לרגליים גם כשהכל לא ברור. מחשבת "ה׳ רואה" מביאה הקלה של ממש.',
    dailyTakeaway:
      'כשמשהו קשה היום, אמור לעצמך: "ה׳ רואה ויודע." שלוש מילים שיכולות לשנות את המצב הרגשי.',
    source: {
      work: { title: 'פלייסהולדר — לצורכי פיתוח UI בלבד' },
      reference: 'placeholder',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-tefilla-02',
    contentType: 'thought',
    topics: ['tefilla', 'ahavat_hashem'],
    title: 'כל תפילה נספרת',
    karovSummary:
      'אפילו כשנדמה שהתפילה לא "עובדת" — המעשה עצמו של הפנייה לה׳ בונה קשר.',
    karovExplanation:
      'לא כל תפילה מביאה את מה שביקשנו, אבל כל תפילה בונה. כמו שיחה בין אב לבנו — לא כל בקשה מתמלאת, אבל כל שיחה מעמיקה את הקשר. התפילה היא הדרך, לא רק האמצעי.',
    dailyTakeaway:
      'היום, נסה להוסיף משפט אחד אישי בתפילה. לא מהסידור — משלך. זו תפילה שלמה.',
    source: {
      work: { title: 'פלייסהולדר — לצורכי פיתוח UI בלבד' },
      reference: 'placeholder',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-shabbat-01',
    contentType: 'thought',
    topics: ['shabbat'],
    title: 'קדושת השבת',
    karovSummary:
      'השבת אינה רק מנוחה מהעבודה — היא זמן של קדושה, שבו אנחנו עוצרים ומזכירים לעצמנו מה באמת חשוב.',
    karovExplanation:
      'שמירת השבת היא אחד מעמודי התווך של הזהות היהודית. ביום השישי בשבת עוצרים הכול — לא כי אין מה לעשות, אלא כי יש מה לחיות. השבת מחדשת את הנשמה ומאפשרת לנו להיכנס לשבוע הבא עם כוחות מחודשים.',
    dailyTakeaway:
      'הכן דבר אחד קטן לכבוד שבת — אפילו פרח אחד, שיר אחד, שיחה אחת עם המשפחה. זו גם קדושת השבת.',
    source: {
      work: { title: 'פלייסהולדר — לצורכי פיתוח UI בלבד' },
      reference: 'placeholder',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },

  // ─── כעס — 5 rotating weekly cards (weekCardIndex 0–4) ───────────────────
  // Sources: רמב"ם הלכות דיעות, תלמוד בבלי, תניא (אגרת הקדש סימן כה + פרק מא)
  // Rebbe letter citations (אגרות קודש) are referenced by letter number only —
  // direct quotation requires Kehot permission (needs_review).
  {
    id: 'ph-kaas-day0',
    contentType: 'mussar',
    topics: ['kaas', 'middot'],
    middahTopic: 'kaas',
    weekCardIndex: 0,
    title: 'כאילו עובד עבודה זרה',
    originalText: 'כָּל הַכּוֹעֵס — כְּאִילּוּ עוֹבֵד עֲבוֹדָה זָרָה',
    karovSummary:
      'ההשוואה נשמעת קיצונית — אבל דווקא בגלל זה היא עובדת. הרמב"ם מביא את הגדרת חז"ל: ברגע של כעס, הוצאנו את הקדוש ברוך הוא מהתמונה. שכחנו שהוא מנהל.',
    karovExplanation:
      'הסבר התניא (אגרת הקדש סימן כה): "לפי שבעת כעסו נסתלקה ממנו האמונה". הכעס אינו רק מידה גרועה — הוא סימן שבאותו רגע אנחנו מאמינים שמה שקרה לנו נגרם על ידי בן-אדם, ולא על ידי בורא עולם. ברגע שהאמונה חוזרת — הכעס מתפוגג.',
    reflectionQuestion: 'ברגע האחרון שכעסת — האם חשבת על זה כמשהו שנגרם לך, או כמשהו שה׳ שלח?',
    dailyTakeaway:
      'כשכעס עולה היום, אזכיר לעצמי: "הוצאתי את ה׳ מהתמונה." זו לא ביקורת עצמית — זו הזמנה להחזיר אותו.',
    source: {
      work: { title: 'רמב"ם', author: 'הרמב"ם' },
      reference: 'הלכות דיעות ב, ג — בשם חז"ל (שבת קה.)',
      version: { licenseStatus: 'public_domain' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-kaas-day1',
    contentType: 'mussar',
    topics: ['kaas', 'middot', 'emunah'],
    middahTopic: 'kaas',
    weekCardIndex: 1,
    title: 'מאת ה׳ היתה זאת',
    originalText:
      'כִּי אִילּוּ הָיָה מַאֲמִין שֶׁמֵּאֵת ה׳ הָיְתָה זֹאת לוֹ — לֹא הָיָה בְּכַעַס כְּלָל',
    karovSummary:
      'האדמו"ר הזקן חושף את השורש: הכעס אינו הבעיה — הוא הסימפטום. הבעיה היא שבאותו רגע שכחנו שמה שקורה לנו מגיע מה׳. האמונה היא התרופה האמיתית.',
    karovExplanation:
      'מה עם האדם שפגע בי? הוא עדיין אחראי — "הרבה שלוחים למקום". הוא עשה בחירה רעה ויישפט עליה. אבל עבורי, הפגיעה הגיעה מה׳, ומוטל עלי לשאול: מה הוא רוצה שאלמד מרגע הזה? כשמתבוננים כך — הכעס לא נעלם, אבל הוא מוצא שאין לו על מי לנחות.',
    reflectionQuestion: 'יש מישהו שאתה כועס עליו כרגע? האם תוכל לראות אותו כשליח, גם אם אינך יכול לסלוח לו עדיין?',
    dailyTakeaway:
      'לפני שאגיב למישהו שמכעיס אותי — אאמר בשקט: "מאת ה׳ היתה זאת." לא כדי להצדיק אלא כדי לחזור לאמת.',
    source: {
      work: { title: 'תניא', author: 'רבי שניאור זלמן מליאדי' },
      reference: 'אגרת הקדש, סימן כה',
      version: { licenseStatus: 'public_domain' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-kaas-day2',
    contentType: 'mussar',
    topics: ['kaas', 'middot', 'yirat_shamayim'],
    middahTopic: 'kaas',
    weekCardIndex: 2,
    title: 'מי מסתכל עליי עכשיו',
    originalText:
      'וְהִנֵּה ה׳ נִצָּב עָלָיו; וּמָלֵא כָל הָאָרֶץ כְּבוֹדוֹ. וּמַבִּיט עָלָיו, וּבוֹחֵן כְּלָיוֹת וָלֵב',
    karovSummary:
      'הרבי מייעץ: כשמרגישים כעס עולה — לחזור בעל פה על תחילת פרק מא בתניא. הזכרון הזה לא נועד לפחד — אלא לשנות את כל התמונה של הרגע.',
    karovExplanation:
      'כולנו מתנהגים אחרת כשמישהו שאנחנו מכבדים עומד לידנו. המיוחד בפרק מא הוא שהוא מחזיר לנו את האמת שתמיד קיימת — ה׳ "ניצב עליו" בכל רגע ורגע. לא כדי לשפוט אלא כי כך זה. ברגע שהאמת הזו ממשית עבורנו, גם הכעס מקבל פרופורציה אחרת.',
    reflectionQuestion: 'איך היית מגיב לאותה מצב אם מישהו שאתה מאוד מכבד היה עומד לידך?',
    dailyTakeaway:
      'ברגע של עצבנות היום, אזכיר: "ה׳ ניצב עלי ומביט עלי." שלוש מילים שמשנות את הרגע.',
    source: {
      work: { title: 'תניא', author: 'רבי שניאור זלמן מליאדי' },
      reference: 'פרק מא',
      version: { licenseStatus: 'public_domain' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-kaas-day3',
    contentType: 'mussar',
    topics: ['kaas', 'middot'],
    middahTopic: 'kaas',
    weekCardIndex: 3,
    title: 'הצעד הראשון: לחכות',
    karovSummary:
      'הרבי כותב: דרך התיקון היא "צעד אחר צעד". הצעד הראשון — ולא הקטן ביותר — הוא פשוט: לא להביע את הכעס בדיבור. לא לדכא, לא לשכוח. רק לא לתת לו לצאת עכשיו.',
    karovExplanation:
      'כשכעס לא זוכה לביטוי — הוא לא צובר תאוצה. הדיבור הכועס מחזק את הכעס, לא מרוקן אותו. ההמתנה היא לא חולשה ולא הדחקה. היא שריר. אפשר לתרגל אותה בצעדים קטנים: לא לומר את המשפט הראשון, לא לשלוח את ההודעה מיד, לצאת מהחדר לרגע. כל עצירה קטנה בונה יכולת גדולה יותר בפעם הבאה.',
    reflectionQuestion: 'האם יש מצב שבו "הרגשת טוב" אחרי שכעסת — ואחר כך התחרטת? מה אמרת שהיית מעדיף לא לומר?',
    dailyTakeaway:
      'ברגע שכעס עולה היום — לא אומר את המשפט הראשון. אצא לרגע, אשתה מים, אחזור. רק זה.',
    source: {
      work: { title: 'אגרות קודש', author: 'הרבי מליובאוויטש' },
      reference: 'איגרת ה׳רלט',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-kaas-day4',
    contentType: 'mussar',
    topics: ['kaas', 'middot', 'ben_adam_lachavero'],
    middahTopic: 'kaas',
    weekCardIndex: 4,
    title: 'אחר כך תצטרך להתנצל',
    karovSummary:
      'הרבי נותן עצה מעשית ומחוכמת: כשפוגעים במישהו — גם מתוך כעס — יש חיוב הלכתי לבקש מחילה. הידיעה שתצטרך להתנצל משנה את החשבון לפני שאתה פותח פה.',
    karovExplanation:
      'הבקשת סליחה קשה. רובנו לא אוהבים לומר "טעיתי" — במיוחד כשאנחנו בטוחים שהאחר הוא זה שגרם. הרבי הופך את הקושי הזה לכלי: אם תדע שאחרי כל כעס שהגעת לו תצטרך להתגבר ולבקש סליחה — הגוף עצמו יתחיל לחשב פעמיים. לא מפחד, אלא כי הנוחות של הכעס כבר לא שווה את מה שיבוא אחריה.',
    reflectionQuestion: 'יש מישהו שפגעת בו מתוך כעס ולא ביקשת מחילה? מה מונע אותך?',
    dailyTakeaway:
      'לפני שאני אומר משהו חריף היום — אשאל: "האם אני מוכן להתנצל על זה אחר כך?" אם לא — לא אגיד.',
    source: {
      work: { title: 'אגרות קודש', author: 'הרבי מליובאוויטש' },
      reference: 'איגרת ו׳עתר — בהסתמך על שולחן ערוך',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
];

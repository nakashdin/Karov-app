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
  // Each day of the week (Sun-Thu) shows a different angle on managing anger.
  // Source text for day 0 is Mishlei 16:32 (public domain biblical text).
  // Days 1-4 are karov_original placeholder content, never for production.
  {
    id: 'ph-kaas-day0',
    contentType: 'mussar',
    topics: ['kaas', 'middot'],
    middahTopic: 'kaas',
    weekCardIndex: 0,
    title: 'הגבורה האמיתית',
    originalText: 'טוֹב אֶרֶךְ אַפַּיִם מִגִּבּוֹר, וּמֹשֵׁל בְּרוּחוֹ מִלֹּכֵד עִיר',
    karovSummary:
      'שלמה המלך מלמד שגבורה גדולה יותר מניצחון חיצוני היא לשלוט בעצמנו — לא לפוצץ ברגע שמשהו מרגיז, אלא לבחור את התגובה שלנו.',
    karovExplanation:
      'בין הגירוי לתגובה יש רגע קטן. כשמישהו אומר משהו שמרגיז אותך, התגובה הראשונה כבר על קצה הלשון. אבל דווקא השניות האלה הן המקום שבו מתחילה עבודת המידות. כל פעם שמצליחים לעצור שם, בונים שריר פנימי חדש.',
    reflectionQuestion: 'מה בדרך כלל גורם לי להגיב מתוך כעס? האם יש תבנית שחוזרת?',
    dailyTakeaway:
      'כשמשהו מכעיס אותי היום — אחכה 5 שניות לפני שאני מגיב. רק לנשום.',
    source: {
      work: { title: 'משלי' },
      reference: 'ט״ז, ל״ב',
      version: { licenseStatus: 'public_domain' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-kaas-day1',
    contentType: 'mussar',
    topics: ['kaas', 'middot'],
    middahTopic: 'kaas',
    weekCardIndex: 1,
    title: 'מאיפה הכעס מגיע?',
    karovSummary:
      'כעס לרוב לא מגיע ממה שקרה — אלא מהפרש שבין מה שציפינו לבין מה שקיבלנו. ההתעסקות עם הציפייה יעילה יותר מהתעסקות עם הכעס.',
    karovExplanation:
      'כשאנחנו מכירים מאיפה הכעס שלנו מגיע, אנחנו מפסיקים להיות קורבן שלו. פתאום אנחנו יכולים לשאול: "מה ציפיתי שיקרה כאן?" — וזו כבר שאלה מועילה.',
    reflectionQuestion: 'על מה אני בעצם כועס? האם זו הציפייה שלי שלא נענתה?',
    dailyTakeaway:
      'כשאני מרגיש כעס עולה היום, אשאל: "מה ציפיתי שיקרה?" — ולא: "מה הוא עשה לי?"',
    source: {
      work: { title: 'פלייסהולדר — לצורכי פיתוח UI בלבד' },
      reference: 'placeholder',
      version: { licenseStatus: 'karov_original' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-kaas-day2',
    contentType: 'mussar',
    topics: ['kaas', 'middot'],
    middahTopic: 'kaas',
    weekCardIndex: 2,
    title: 'כעס ועלבון',
    karovSummary:
      'הרבה פעמים הכעס הוא תגובה להרגשת עלבון — מישהו לא כיבד אותנו, לא ראה אותנו, לא העריך. כשמזהים את זה, הכעס הופך לפחות מפחיד.',
    karovExplanation:
      'אדם שמרגיש בטוח בעצמו נפגע פחות מביקורת. לא כי הוא לא מרגיש — אלא כי הזהות שלו לא תלויה בהסכמת האחרים. זו עבודה ארוכת שנים, אבל מתחילה ברגע הזה של ההכרה.',
    reflectionQuestion: 'האם הכעס שלי קשור לתחושת פגיעה בכבוד עצמי?',
    dailyTakeaway:
      'כשאני כועס היום, אשאל את עצמי: "האם הרגשתי שלא ראו אותי?" — ואדאג לכבד את עצמי ללא תלות בתגובת האחר.',
    source: {
      work: { title: 'פלייסהולדר — לצורכי פיתוח UI בלבד' },
      reference: 'placeholder',
      version: { licenseStatus: 'karov_original' },
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
    title: 'לשחרר',
    karovSummary:
      'כעס שמחזיקים בפנים לא פוגע באדם שגרם לו — הוא פוגע בנו. שחרור הכעס הוא מתנה לעצמנו, לא לאחר.',
    karovExplanation:
      'שחרור כעס לא אומר לומר "לא קרה כלום" — זה לא כנה. זה אומר להחליט: "אני לא נותן לרגע הזה לתפוס יותר מקום בחיי משמגיע לו." זו בחירה שעושים, לא תחושה שמחכים לה.',
    reflectionQuestion: 'יש כעס שאני מחזיק מזמן — מה הוא עולה לי?',
    dailyTakeaway:
      'כעס ישן שאני נושא — אכתוב אותו על פיסת נייר, ואז אקפל ואניח בצד. פיזית.',
    source: {
      work: { title: 'פלייסהולדר — לצורכי פיתוח UI בלבד' },
      reference: 'placeholder',
      version: { licenseStatus: 'karov_original' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
  {
    id: 'ph-kaas-day4',
    contentType: 'mussar',
    topics: ['kaas', 'middot'],
    middahTopic: 'kaas',
    weekCardIndex: 4,
    title: 'כעס ואהבה',
    karovSummary:
      'כעס כלפי מי שאוהבים הוא קשה במיוחד — כי דווקא עם מי שאנחנו קרובים אנחנו מרשים לעצמנו להיות פחות שמורים. אבל מי שאנחנו אוהבים ראויים לגרסה הכי טובה שלנו.',
    karovExplanation:
      'ביחסים קרובים, כעס לעיתים מגיע מאכזבה — כי ציפינו יותר. אבל בני הבית שלנו, ילדינו, בני זוגנו — הם לא שלמים, כמונו. ה"ארך אפיים" מתחיל בבית.',
    reflectionQuestion: 'האם אני שמור יותר עם זרים מאשר עם מי שאני אוהב?',
    dailyTakeaway:
      'היום אבחר לדבר בסבלנות אחת עם מישהו קרוב, אפילו כשמגיע לי לכעוס.',
    source: {
      work: { title: 'פלייסהולדר — לצורכי פיתוח UI בלבד' },
      reference: 'placeholder',
      version: { licenseStatus: 'karov_original' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
];

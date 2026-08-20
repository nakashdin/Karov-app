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
];

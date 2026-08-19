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
    title: 'תפילה — שיחה עם ה׳',
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
    id: 'ph-teshuva-01',
    contentType: 'thought',
    topics: ['teshuva', 'anavah'],
    title: 'תשובה — חזרה לעצמך',
    karovSummary:
      'תשובה אינה ענישה עצמית — היא חזרה. חזרה לעצמנו, לערכינו, לקשר עם מה שחשוב לנו באמת.',
    karovExplanation:
      'שערי תשובה מלמד שכל אדם יכול לחזור בכל רגע. הדבר הגדול ביותר בתשובה הוא לא הפסקת הטעות — אלא שאנחנו לוקחים אחריות ובוחרים אחרת. זה מעשה של כוח, לא של חולשה.',
    dailyTakeaway:
      'זהה היום משהו קטן שאתה רוצה לשפר. לא חייב להיות גדול. קח צעד קטן אחד לכיוון הנכון.',
    source: {
      work: { title: 'שערי תשובה', author: 'רבינו יונה מגירונדי' },
      reference: 'שער א׳, פרק א׳',
      version: { licenseStatus: 'needs_review' },
    },
    readingTimeMinutes: 2,
    reviewStatus: 'draft',
    isPlaceholder: true,
  },
];

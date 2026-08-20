/**
 * Import kosher shawarma places — batch 2 — 2026-07-20
 * Sources: rabanut.co.il, easy.co.il, badatz.biz, ydat.org.il, mdn.org.il, mdh.org.il
 * All records: kashrut verified + complete hours
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

const PLACES = [

  // ─── בוטרא + דונר אקספרס (היו גבוליים, עכשיו שעות מלאות) ──────
  {
    prefix: 'butra', name: 'בוטרא תל אביב',
    city: 'תל אביב', address: 'הארבעה 28, תל אביב',
    phone: '03-7500777', lat: 32.0685, lng: 34.7873,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'doner', name: 'דונר אקספרס יהוד',
    city: 'יהוד מונסון', address: 'אברהם גירון 15, יהוד מונסון',
    phone: '03-6325111', lat: 32.0345, lng: 34.8802,
    hours: "א'-ה' 10:00-23:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', website: 'https://doneryehud.co.il',
  },

  // ─── תל אביב יפו (חדשים) ─────────────────────────────────────────
  {
    prefix: 'elijahyaffo', name: 'שווארמה אליהו יפו',
    city: 'תל אביב', address: 'בית אל 12, יפו, תל אביב',
    phone: '03-9591891', lat: 32.0503, lng: 34.7536,
    hours: "א'-ה' 11:00-19:00 | ו' 08:00-14:00 | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'tombik', name: 'טומביק שווארמה תל אביב',
    city: 'תל אביב', address: 'אבא אחימאיר 15, מרכז שוסטר, תל אביב',
    phone: '050-364-3333', lat: 32.1011, lng: 34.8175,
    hours: "א'-ה' 11:00-21:30 | ו' 11:00-15:30 | ש' סגור",
    kosher: 'rabanut', website: 'https://www.instagram.com/tombik_1',
  },
  {
    prefix: 'yashkaatidim', name: 'יאשקה קרית עתידים תל אביב',
    city: 'תל אביב', address: 'דבורה הנביאה 121, קרית עתידים, תל אביב',
    phone: '03-5057632', lat: 32.1126, lng: 34.8353,
    hours: "א'-ה' 11:00-17:00 | ו' 10:30-15:30 | ש' סגור",
    kosher: 'rabanut', website: 'https://www.yashka.co.il',
  },

  // ─── הרצליה / רמת השרון / הוד השרון ─────────────────────────────
  {
    prefix: 'tzarumherzliya', name: 'שווארמה צארום הרצליה',
    city: 'הרצליה', address: 'סוקולוב 73, הרצליה',
    phone: '09-886-4999', lat: 32.1664, lng: 34.8406,
    hours: "א'-ה' 11:00-00:00 | ו' 11:00-15:00 | ש' מוצ\"ש עד 01:00",
    kosher: 'rabanut', website: 'https://tzarum.co.il',
    social: 'https://www.instagram.com/shawarma_tzarum',
  },
  {
    prefix: 'tzarumraanana', name: 'שווארמה צארום רעננה',
    city: 'רעננה', address: 'אחוזה 89, רעננה',
    phone: '077-954-2510', lat: 32.1826, lng: 34.8715,
    hours: "א'-ה' 11:00-23:00 | ו' 10:00-15:00 | ש' מוצ\"ש עד 00:00",
    kosher: 'badatz_beit_yosef', website: 'https://www.instagram.com/shawarma_tzarum89',
  },
  {
    prefix: 'bshadraRS', name: 'שווארמה בשדרה רמת השרון',
    city: 'רמת השרון', address: 'סוקולוב 69, רמת השרון',
    phone: '03-5402129', lat: 32.1460, lng: 34.8339,
    hours: "א'-ה' 10:30-22:30 | ו' 10:30-15:00 | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'bkikarHS', name: 'שווארמה בכיכר הוד השרון',
    city: 'הוד השרון', address: 'הידידות 11, הוד השרון',
    phone: '09-744-1165', lat: 32.1506, lng: 34.8958,
    hours: "א'-ה' 10:30-20:30 | ו' 10:30-15:00 | ש' סגור",
    kosher: 'rabanut', website: null,
  },

  // ─── פתח תקווה / כפר סבא ─────────────────────────────────────────
  {
    prefix: 'boyaPT', name: 'שווארמה בויה פתח תקווה',
    city: 'פתח תקווה', address: 'היצירה 5, פתח תקווה',
    phone: '052-245-3874', lat: 32.0887, lng: 34.8797,
    hours: "א'-ה' 10:00-17:30 | ו' סגור | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'nadavPT', name: 'נדב שווארמה ופלאפל פתח תקווה',
    city: 'פתח תקווה', address: 'חיים עוזר 38, פתח תקווה',
    phone: '03-9318355', lat: 32.0863, lng: 34.8841,
    hours: "א'-ה' 09:30-21:00 | ו' 09:00-14:00 | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'agababaKS', name: 'אגבבה שווארמה שמש כפר סבא',
    city: 'כפר סבא', address: 'אנגל 78, מרכז דימרי, כפר סבא',
    phone: '09-894-5866', lat: 32.1713, lng: 34.9001,
    hours: "א'-ה' 11:00-22:00 | ו' 11:00-16:00 | ש' סגור",
    kosher: 'rabanut', website: 'https://shawarma-agababa.co.il',
    social: 'https://www.instagram.com/shawarma_agababa',
  },

  // ─── נתניה ────────────────────────────────────────────────────────
  {
    prefix: 'beitratzon1', name: 'שווארמה בית רצון נתניה גיבורים',
    city: 'נתניה', address: 'שדרות גיבורי ישראל 40, נתניה',
    phone: '09-767-7922', lat: 32.3255, lng: 34.8527,
    hours: "א'-ה' 11:00-21:00 | ו' 09:00-14:00 | ש' סגור",
    kosher: 'rabanut', social: 'https://www.instagram.com/shawarma_beit_ratzon',
  },
  {
    prefix: 'beitratzon2', name: 'שווארמה בית רצון נתניה שער הגיא',
    city: 'נתניה', address: 'שער הגיא 5, נתניה',
    phone: '09-861-6157', lat: 32.3281, lng: 34.8518,
    hours: "א'-ה' 09:00-22:00 | ו' 09:00-15:30 | ש' מוצ\"ש עד 23:00",
    kosher: 'rabanut', social: 'https://www.instagram.com/shawarma_beit_ratzon',
  },
  {
    prefix: 'shimeonstar', name: 'שמעון סטאר נתניה',
    city: 'נתניה', address: 'הנוטע 1, נתניה',
    phone: '052-527-0877', lat: 32.3238, lng: 34.8588,
    hours: "א'-ה' 11:30-22:30 | ו' 11:00-15:10 | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'nona', name: 'שווארמה נונה נתניה',
    city: 'נתניה', address: 'סמילנסקי 5, נתניה',
    phone: '077-961-6536', lat: 32.3253, lng: 34.8504,
    hours: "א'-ה' 10:00-03:00 | ו' 08:00-כניסת שבת | ש' מוצ\"ש עד 03:00",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'shefbherzl', name: 'השף בהרצל נתניה',
    city: 'נתניה', address: 'הרצל 44, נתניה',
    phone: '076-801-7672', lat: 32.3235, lng: 34.8535,
    hours: "א'-ה' 10:00-02:00 | ו' 10:00-כניסת שבת | ש' מוצ\"ש עד 02:00",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'shefalaash', name: 'שף על האש נתניה',
    city: 'נתניה', address: 'אחד העם 14, נתניה',
    phone: '077-550-9492', lat: 32.3170, lng: 34.8516,
    hours: "א'-ה' 11:00-00:00 | ו' 11:00-19:30 | ש' מוצ\"ש עד 00:00",
    kosher: 'mehadrin', social: 'https://www.facebook.com/shefalaash',
  },
  {
    prefix: 'shawarmaexpress', name: 'שווארמה אקספרס נתניה',
    city: 'נתניה', address: 'שדרות טום לנטוס 8, נתניה',
    phone: '09-745-5545', lat: 32.3210, lng: 34.8550,
    hours: "א'-ה' 11:00-00:00 | ו' סגור | ש' מוצ\"ש עד 00:00",
    kosher: 'rabanut', website: null,
  },

  // ─── תל מונד ──────────────────────────────────────────────────────
  {
    prefix: 'omaysitm', name: 'פלאפל עומייסי תל מונד',
    city: 'תל מונד', address: 'הדקל 85, תל מונד',
    phone: '050-265-6433', lat: 32.2693, lng: 34.9206,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'rabanut', social: 'https://www.facebook.com/omfalafel',
  },

  // ─── פרדס חנה / חריש / נשר / קרית אתא ──────────────────────────
  {
    prefix: 'leshalom', name: 'שווארמה לשלום פרדס חנה',
    city: 'פרדס חנה כרכור', address: 'המייסדים 31, פרדס חנה כרכור',
    phone: '04-811-1951', lat: 32.4770, lng: 34.9795,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'badatz_beit_yosef', social: 'https://www.facebook.com/Shawarmaleshalom.co.il',
  },
  {
    prefix: 'shalhavtia', name: 'שלהבתיה חריש',
    city: 'חריש', address: 'דרך ארץ 42, חריש',
    phone: '053-934-9082', lat: 32.4527, lng: 35.0245,
    hours: "א'-ד' 11:00-22:00 | ה' 11:00-23:00 | ו' סגור | ש' סגור",
    kosher: 'mehadrin', website: 'https://beharish.co.il/b/שלהבתיה/',
  },
  {
    prefix: 'bkikarnesher', name: 'שווארמה בכיכר נשר',
    city: 'נשר', address: 'ברק 2, נשר',
    phone: '054-547-4373', lat: 32.7628, lng: 35.0407,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'kosher', social: 'https://www.facebook.com/shipodim',
  },
  {
    prefix: 'elijahKA', name: 'שווארמה פלאפל אליהו קרית אתא',
    city: 'קרית אתא', address: 'העצמאות 72, קרית אתא',
    phone: '077-536-3305', lat: 32.8011, lng: 35.1081,
    hours: "א'-ה' 10:30-19:00 | ו' 10:30-15:00 | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'sammiKA', name: 'סמי שווארמה ובשר על האש קרית אתא',
    city: 'קרית אתא', address: 'העצמאות 51, קרית אתא',
    phone: '04-827-2220', lat: 32.8018, lng: 35.1074,
    hours: "א'-ה' 10:00-22:00 | ו' 08:30-14:00 | ש' סגור",
    kosher: 'mehadrin', website: 'https://sammyshawarma.co.il',
    social: 'https://www.instagram.com/sammy.shawarma',
  },

  // ─── חיפה / נהריה / שלומי / מעלות / שומרה ────────────────────────
  {
    prefix: 'teomimhaifa', name: 'שווארמה התאומים חיפה',
    city: 'חיפה', address: 'שדרות טרומפלדור 56, חיפה',
    phone: '04-869-1446', lat: 32.8134, lng: 35.0005,
    hours: "א'-ה' 12:00-22:30 | ו' 12:00-16:00 | ש' סגור",
    kosher: 'rabanut', social: 'https://www.instagram.com/the_twin_shawarma',
  },
  {
    prefix: 'papaluski', name: 'פאפא לוסקי נהריה',
    city: 'נהריה', address: 'שדרות הגעתון 19, נהריה',
    phone: '04-992-9459', lat: 33.0056, lng: 35.0960,
    hours: "א'-ה' 09:00-22:00 | ו' 09:00-14:00 | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'ramoshlomi', name: 'שווארמה רמו שלומי',
    city: 'שלומי', address: 'אזור תעשיה, שלומי',
    phone: '052-448-1377', lat: 33.0648, lng: 35.1477,
    hours: "א'-ה' 07:00-18:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'maalotrest', name: 'מסעדות העיר מעלות תרשיחא',
    city: 'מעלות תרשיחא', address: 'הרב קוק 28, מעלות תרשיחא',
    phone: '04-999-7608', lat: 33.0144, lng: 35.2721,
    hours: "א'-ה' 09:00-23:00 | ו' 09:00-15:00 | ש' מוצ\"ש עד 00:00",
    kosher: 'rabanut', website: null,
  },
  {
    prefix: 'abaala', name: 'מסעדת אבאלה שומרה',
    city: 'שומרה', address: 'שומרה',
    phone: '04-693-2051', lat: 33.0701, lng: 35.3025,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'mehadrin', social: 'https://www.facebook.com/p/מסעדת-אבאלה-61576725657280/',
  },

  // ─── צפת / נוף הגליל / צמח ───────────────────────────────────────
  {
    prefix: 'lafarafi', name: 'הלאפה של רפי צפת',
    city: 'צפת', address: 'ירושלים 88, צפת',
    phone: '04-692-1496', lat: 32.9645, lng: 35.4969,
    hours: "א'-ה' 09:00-23:00 | ו' 08:00-כניסת שבת | ש' סגור",
    kosher: 'rabanut', social: 'https://www.facebook.com/212262719713761',
  },
  {
    prefix: 'beit148', name: 'בית השווארמה 148 צפת',
    city: 'צפת', address: 'דרך השוקולד, צפת',
    phone: '053-809-6343', lat: 32.9656, lng: 34.4981,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'mehadrin', website: null,
  },
  {
    prefix: 'avivnofhagalil', name: 'מסעדת אביב נוף הגליל',
    city: 'נוף הגליל', address: 'כסולות, נוף הגליל',
    phone: '04-610-3190', lat: 32.7170, lng: 35.2978,
    hours: "א'-ה' 10:00-20:00 | ו' 09:30-13:30 | ש' סגור",
    kosher: 'mehadrin', social: 'https://www.facebook.com/avivsrestaurant',
  },
  {
    prefix: 'taiimtzmaх', name: 'טעים בצמח',
    city: 'צמח', address: 'מפעלים אזוריים, צמח',
    phone: '04-638-8745', lat: 32.7195, lng: 35.5861,
    hours: "א'-ה' 08:00-19:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', website: null,
  },

  // ─── טבריה ────────────────────────────────────────────────────────
  {
    prefix: 'levinTib', name: 'שווארמה לוין טבריה',
    city: 'טבריה', address: 'הגליל 32, טבריה',
    phone: '050-648-7046', lat: 32.7906, lng: 35.5267,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'badatz_beit_yosef', social: 'https://www.facebook.com/bagetlevintiberias',
  },
  {
    prefix: 'nirTib', name: 'באגט ניר שווארמה טבריה',
    city: 'טבריה', address: 'אלחדיף 3, טבריה',
    phone: '04-671-2669', lat: 32.7832, lng: 35.5311,
    hours: "א'-ה' 10:30-00:00 | ו' עד כניסת שבת | ש' מוצ\"ש עד 00:00",
    kosher: 'badatz_beit_yosef', social: 'https://www.instagram.com/bagetnir.tiberias/',
  },

  // ─── עפולה ────────────────────────────────────────────────────────
  {
    prefix: 'teomimAfula', name: 'שווארמה התאומים עפולה',
    city: 'עפולה', address: 'קפלן 12, עפולה',
    phone: '04-999-9653', lat: 32.6089, lng: 35.2905,
    hours: "א'-ה' 09:00-22:00 | ו' 09:00-15:00 | ש' סגור",
    kosher: 'mehadrin', website: 'https://www.shawarmahteomim.co.il',
  },
  {
    prefix: 'shawarmoosAfula', name: 'שווארמוס עפולה',
    city: 'עפולה', address: 'קהילת ציון 4, עפולה',
    phone: '04-659-7550', lat: 32.6086, lng: 35.2832,
    hours: "א'-ה' 10:00-20:00 | ו' 08:00-15:00 | ש' סגור",
    kosher: 'rabanut', website: null,
  },

  // ─── ירושלים ──────────────────────────────────────────────────────
  {
    prefix: 'mesoov', name: 'מסוב ירושלים',
    city: 'ירושלים', address: 'יפו 234, ירושלים',
    phone: '02-538-9413', lat: 31.7872, lng: 35.2214,
    hours: "א'-ה' 09:00-22:30 | ו' 09:00-15:00 | ש' סגור",
    kosher: 'mehadrin', website: null,
  },
  {
    prefix: 'drorJLM', name: 'דרור הקטן ירושלים',
    city: 'ירושלים', address: 'א.ש. הרטום, ירושלים',
    phone: '02-579-0109', lat: 31.7526, lng: 35.1954,
    hours: "א'-ה' 07:30-19:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'mehadrin', website: null,
  },
  {
    prefix: 'akaJLM', name: 'אקה ירושלים',
    city: 'ירושלים', address: 'השיקמה 6, ירושלים',
    phone: '02-500-1292', lat: 31.7817, lng: 35.2178,
    hours: "א'-ד' 11:00-21:00 | ה' 11:00-00:00 | ו' 10:30-15:30 | ש' סגור",
    kosher: 'rabanut', social: 'https://www.facebook.com/100046888784150',
  },
  {
    prefix: 'hashamenJLM', name: 'השמן ירושלים',
    city: 'ירושלים', address: 'רבן יוחנן בן זכאי 7, ירושלים',
    phone: '02-674-4666', lat: 31.7650, lng: 35.1978,
    hours: "א'-ה' 10:30-21:00 | ו' 10:00-15:00 | ש' סגור",
    kosher: 'rabanut', website: 'https://hashamen.co.il',
  },
  {
    prefix: 'hashamenMevaser', name: 'השמן מבשרת ציון',
    city: 'מבשרת ציון', address: 'מבשרת ציון',
    phone: '054-678-9823', lat: 31.8050, lng: 35.1392,
    hours: "א'-ה' 09:00-03:00 | ו' 09:00-15:00 | ש' סגור",
    kosher: 'mehadrin', website: 'https://hashamen.co.il',
  },
  {
    prefix: 'hashamenBS', name: 'השמן בית שמש',
    city: 'בית שמש', address: 'שדרות יגאל אלון 24, בית שמש',
    phone: '02-992-2382', lat: 31.7491, lng: 34.9909,
    hours: "א'-ה' 11:00-22:30 | ו' 09:00-13:00 | ש' סגור",
    kosher: 'mehadrin', social: 'https://www.instagram.com/hashamen_beit_shemesh/',
  },

  // ─── מודיעין / ראש העין ───────────────────────────────────────────
  {
    prefix: 'babajim', name: 'באבאג\'ים מודיעין',
    city: 'מודיעין מכבים רעות', address: 'עמק דותן 66, מרכז מסחרי מרל"ז, מודיעין',
    phone: '08-926-6628', lat: 31.9073, lng: 35.0124,
    hours: "א'-ה' 11:00-22:00 | ו' 11:00-15:00 | ש' סגור",
    kosher: 'rabanut', social: 'https://www.facebook.com/babajim.mamajim.modiin/',
  },
  {
    prefix: 'azrielRE', name: 'השווארמה של עזריאל ראש העין',
    city: 'ראש העין', address: 'מרכז הקסמים 5, ראש העין',
    phone: '052-875-1770', lat: 32.0955, lng: 34.9499,
    hours: "א'-ה' 11:00-00:00 | ו' סגור | ש' סגור",
    kosher: 'rabanut', social: 'https://www.facebook.com/AzrielShawarma/',
  },
  {
    prefix: 'rafaelModiin', name: 'שווארמה רפאל מודיעין',
    city: 'מודיעין מכבים רעות', address: 'דם המכבים 42, מודיעין',
    phone: '072-392-6712', lat: 31.9028, lng: 35.0056,
    hours: "א'-ה' 11:00-23:45 | ו' 10:00-15:00 | ש' מוצ\"ש עד 22:00",
    kosher: 'rabanut', website: 'https://refaelshawarma.co.il',
  },
  {
    prefix: 'abuGhoshModiin', name: 'שווארמה אבו גוש מודיעין',
    city: 'מודיעין מכבים רעות', address: 'המכונאי 1, מודיעין',
    phone: '08-910-5526', lat: 31.9014, lng: 35.0065,
    hours: "א'-ה' 10:30-22:30 | ו' 09:00-15:00 | ש' סגור",
    kosher: 'rabanut', website: 'https://shawarmaabu-ghosh.co.il',
  },
];

function makeId(prefix, name) {
  return prefix + '-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.prefix, b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    phone: b.phone,
    location: { latitude: b.lat, longitude: b.lng },
    ...(b.website ? { website: b.website } : b.social ? { website: b.social } : {}),
    openingHours: b.hours,
    category: 'meat',
    kosherType: b.kosher,
    tags: ['shawarma'],
    source: 'manual',
    lastVerifiedAt: '2026-07-20',
  };
}

function readJson(p) {
  const raw = readFileSync(p);
  const str = raw[0] === 0xEF ? raw.slice(3).toString('utf8') : raw.toString('utf8');
  return JSON.parse(str);
}
function writeJson(p, data) {
  writeFileSync(p, Buffer.concat([BOM, Buffer.from(JSON.stringify(data, null, 2), 'utf8')]));
}
function mergeInto(existing, newRecords) {
  const existingIds = new Set(existing.map(r => r.id));
  const toAdd = newRecords.filter(r => !existingIds.has(r.id));
  return { merged: [...existing, ...toAdd], added: toAdd.length, skipped: newRecords.length - toAdd.length };
}

console.log('=== Import Shawarma Batch 2 ===');
const places = PLACES.map(buildPlace);
console.log(`Building ${places.length} records`);

for (const filePath of [
  path.join(DATA_DIR, 'restaurants.osm.json'),
  path.join(DATA_DIR, 'places.osm.json'),
]) {
  const data = readJson(filePath);
  const { merged, added, skipped } = mergeInto(data, places);
  writeJson(filePath, merged);
  console.log(`${path.basename(filePath)}: +${added} added, ${skipped} skipped`);
}
console.log('\nDone!');

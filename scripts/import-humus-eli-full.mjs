/**
 * Full import of all Hummus Eliyahu branches scraped from humus-eli-yahoo.com/restaurants/
 * Geocodes via Nominatim, deduplicates against existing data, appends new records.
 *
 * Run: node scripts/import-humus-eli-full.mjs
 * Golden rule: additive only — never deletes existing records.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

function readJsonNoBom(path) {
  const buf = readFileSync(path);
  const str = buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF
    ? buf.slice(3).toString('utf8')
    : buf.toString('utf8');
  return JSON.parse(str);
}
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLACES_FILE = join(__dirname, '../src/data/generated/places.osm.json');
const RESTAURANTS_FILE = join(__dirname, '../src/data/generated/restaurants.osm.json');
const UA = 'karov-app/1.0 (research; nakashdin@gmail.com)';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── All scraped branches ──────────────────────────────────────────────────────
const BRANCHES = [
  { name: 'חומוס אליהו אור יהודה',          address: 'המפעל 13, אור יהודה',                         city: 'אור יהודה',          phone: '03-5098537',   hours: 'א-ה 10:00-20:00 | ו 08:30-15:00', kosher: 'badatz_beit_yosef' },
  { name: 'חומוס אליהו אזור',                address: 'רחוב המצודה 8, אזור',                          city: 'אזור',               phone: '03-7731713',   hours: 'א-ה 09:00-20:00', kosher: 'rabanut' },
  { name: 'חומוס אליהו אילת',                address: 'הבורסקאי 9, אזה"ת אילת',                       city: 'אילת',               phone: '08-9217177',   hours: 'א-ה 10:00-18:00 | ו 10:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו אלונים',              address: 'חוצות אלונים, צומת אלונים',                    city: 'אלוני אבא',          phone: '04-6206309',   hours: 'א-ה 09:00-19:00 | ו 09:00-13:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו אריאל',               address: 'רמת הגולן 29, אריאל',                          city: 'אריאל',              phone: '077-6495160',  hours: 'א-ה 10:00-19:00 | ו 10:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו אשדוד',               address: 'הבנאים 7, אשדוד',                              city: 'אשדוד',              phone: '08-6636368',   hours: 'א-ה 09:30-16:00 | ו 09:30-13:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו אשקלון',              address: 'מרינה אשקלון',                                  city: 'אשקלון',             phone: '08-6166444',   hours: 'א-ה 10:30-22:30 | ו 10:00-14:00', kosher: 'rav_landa' },
  { name: 'חומוס אליהו באר טוביה',           address: 'א.תעשייה באר טוביה, R Center',                 city: 'באר טוביה',          phone: '08-6536330',   hours: 'א-ה 10:00-18:45 | ו 10:00-13:00', kosher: 'rabanut_mehadrin' },
  { name: 'חומוס אליהו באר יעקב',            address: 'שא נס 17, קניון באר יעקב',                     city: 'באר יעקב',           phone: '08-6271990',   hours: 'א-ה 10:00-20:00 | ו 09:30-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו באר שבע פז צפון',     address: 'שדרות ירושלים 2, בנין ב"ש שכונה ט',           city: 'באר שבע',            phone: '08-9246661',   hours: 'א 09:30-20:00 | ב-ה 09:30-21:30 | ו 09:30-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו באר שבע מצדה',        address: 'דרך מצדה 6, מרכז הנגב, באר שבע',              city: 'באר שבע',            phone: '077-4015344',  hours: 'א-ה 10:30-20:00 | ו 10:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו בית השיטה',           address: 'תחנת דלק דור אלון, בכניסה לקיבוץ בית השיטה', city: 'בית השיטה',          phone: '04-6332290',   hours: 'א-ה 10:00-16:00 | ו 09:30-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו בית שאן',             address: 'היצירה 4, בית שאן',                            city: 'בית שאן',            phone: '04-6737373',   hours: 'א-ה 09:30-20:00 | ו 09:00-14:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו בית שמש',             address: 'שד\' יגאל אלון 2, תחנת פז בית שמש',           city: 'בית שמש',            phone: '02-5782197',   hours: 'א-ד 10:30-20:00 | ה 10:30-22:00 | ו 09:30-15:00', kosher: 'badatz_beit_yosef' },
  { name: 'חומוס אליהו בית שמש סאן מול',     address: 'האמוראים 2, בית שמש',                          city: 'בית שמש',            phone: '052-5118990',  hours: 'א-ה 11:00-21:00 | ו 10:00-13:00', kosher: 'other' },
  { name: 'חומוס אליהו בני ברק',             address: 'הירקון 10, בני ברק',                           city: 'בני ברק',            phone: '03-5229909',   hours: 'א-ה 10:00-22:00 | ו 09:00-14:00', kosher: 'rav_machpud' },
  { name: 'חומוס אליהו בנימינה',             address: 'השריג 2, מתחם הפיל, בנימינה',                  city: 'בנימינה-גבעת עדה',  phone: '04-6561516',   hours: 'א-ה 10:00-19:00 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו בת ים',               address: 'הרב ניסנבאום 37, בת ים',                       city: 'בת ים',              phone: '03-5093683',   hours: 'א-ה 09:30-20:00 | ו 09:00-15:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו גבעת שאול ירושלים',   address: 'כנפי נשרים 24, גבעת שאול, ירושלים',           city: 'ירושלים',            phone: '077-2302445',  hours: 'א-ה 09:00-20:00 | ו 09:00-15:00', kosher: 'rav_machpud' },
  { name: 'חומוס אליהו גוש עציון',           address: 'צומת גוש עציון',                               city: 'גוש עציון',          phone: '02-5821655',   hours: 'א-ה 10:00-20:30 | ו 08:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו גן יבנה',             address: 'תחנת דלק דור אלון, גן יבנה',                  city: 'גן יבנה',            phone: '054-5852397',  hours: 'א-ה 08:30-18:00 | ו 07:30-14:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו גשר הזיו',            address: 'תחנת דלק דור אלון, כניסה לקיבוץ גשר הזיו',   city: 'גשר הזיו',           phone: '04-6475581',   hours: 'א-ה 09:00-20:00 | ו 08:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו דימונה',              address: 'קניון פרץ סנטר, דימונה',                       city: 'דימונה',             phone: '08-8666900',   hours: 'א-ה 09:00-21:00 | ו 09:00-15:00', kosher: 'badatz_beit_yosef' },
  { name: 'חומוס אליהו הרצליה פיתוח',        address: 'משכית 32, הרצליה פיתוח',                       city: 'הרצליה',             phone: '09-9736397',   hours: 'א-ה 09:30-17:00 | ו 09:30-14:30', kosher: 'rabanut_mehadrin' },
  { name: 'חומוס אליהו הרצליה שער העיר',     address: 'בן גוריון 22, שער העיר, הרצליה',              city: 'הרצליה',             phone: '09-8877846',   hours: 'א-ה 10:00-17:00 | ו 10:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו חדרה',                address: 'מתחם מול החוף וילג\', חדרה',                   city: 'חדרה',               phone: '04-9080809',   hours: 'א-ה 10:00-20:00 | ו 10:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו חולון',               address: 'גולדה מאיר 7, קניון עזריאלי חולון',           city: 'חולון',              phone: '03-5088849',   hours: 'א-ה 10:30-20:00 | ו 10:30-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו טבריה עלית פוריה',    address: 'הניאון 4, תחנת הדלק ארזים, טבריה',            city: 'טבריה',              phone: '04-6999778',   hours: 'א-ה 09:30-18:00 | ו 08:30-13:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו טבריה הגליל',         address: 'הגליל 10, טבריה',                              city: 'טבריה',              phone: '04-6277888',   hours: 'א-ה 10:00-18:00 | ו 10:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו טירת הכרמל',          address: 'קרן היסוד 2, טירת הכרמל',                     city: 'טירת כרמל',          phone: '04-6951549',   hours: 'א-ה 10:00-18:30 | ו 09:30-14:00', kosher: 'rabanut' },
  { name: 'חומוס אליהו יוקנעם',              address: 'תחנת דלק, פארק תעשיה יוקנעם',                 city: 'יקנעם עילית',        phone: '04-9890916',   hours: 'א-ה 09:00-19:00 | ו 08:30-14:00', kosher: 'rabanut_mehadrin' },
  { name: 'חומוס אליהו ים המלח עין בוקק',    address: 'קניונית עין בוקק, ים המלח',                   city: 'ים המלח',            phone: '08-6143083',   hours: 'א-ה 09:00-21:00 | ו 09:00-15:00', kosher: 'rabanut' },
  { name: 'חומוס אליהו ירושלים הדר תלפיות', address: 'גנרל פייר קניג 26, קניון הדר, ירושלים',       city: 'ירושלים',            phone: '02-6754455',   hours: 'א 10:00-21:00 | ב-ה 10:00-21:30 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ירושלים מבשרת ציון', address: 'הראל 1, מבשרת ציון',                           city: 'מבשרת ציון',         phone: '050-9232233',  hours: 'א-ה 09:00-19:30 | ו 08:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ירושלים שורש שואבה', address: 'שואבה 1, ירושלים',                             city: 'ירושלים',            phone: '077-9800380',  hours: 'א-ה 09:00-20:00 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ירושלים מחנה יהודה', address: 'השזיף 10, שוק מחנה יהודה, ירושלים',           city: 'ירושלים',            phone: '02-5492353',   hours: 'א-ה 10:30-19:00 | ו 09:00-13:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ירושלים פסגת זאב',   address: 'קניון לב הפסגה, משה דיין 106, ירושלים',       city: 'ירושלים',            phone: '02-5666882',   hours: 'א-ה 10:30-20:00 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ירושלים יפו 33',      address: 'יפו 33, ירושלים',                              city: 'ירושלים',            phone: '077-9386235',  hours: 'א-ה 10:00-21:30 | ו 10:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ירושלים הר חוצבים',  address: 'קרית המדע 3, ירושלים',                         city: 'ירושלים',            phone: '02-6200405',   hours: 'א-ה 11:30-21:00 | ו סגור', kosher: 'badatz_rubin' },
  { name: 'חומוס אליהו ירושלים מלחה',        address: 'אגודת ספורט ביתר 1, קניון עזריאלי מלחה',     city: 'ירושלים',            phone: '02-6634577',   hours: 'א 10:30-21:00 | ב-ה 10:30-22:00 | ו 09:30-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ירושלים סנטר 1',      address: 'ירמיהו 43, קניון סנטר 1, ירושלים',            city: 'ירושלים',            phone: '077-4170400',  hours: 'א-ה 10:30-21:00 | ו סגור', kosher: 'other' },
  { name: 'חומוס אליהו ירושלים קניון רמות',  address: 'שדרות גולדה מאיר 255, ירושלים',               city: 'ירושלים',            phone: '073-3962571',  hours: 'א-ה 10:00-21:00 | ו 09:00-13:30', kosher: 'other' },
  { name: 'חומוס אליהו ישפרו סנטר מודיעין', address: 'שדרות המלאכות 121, ישפרו סנטר, מודיעין',     city: 'מודיעין-מכבים-רעות', phone: '08-6665959',   hours: 'א-ה 10:00-20:00 | ו 09:00-15:00', kosher: 'rabanut' },
  { name: 'חומוס אליהו כפר יונה',            address: 'דוד בן גוריון 1, קניון כפר יונה',             city: 'כפר יונה',           phone: '077-9386471',  hours: 'א-ה 09:00-20:00 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו כפר סבא עתיר ידע',   address: 'עתיר ידע 6, תחנת TEN, כפר סבא',              city: 'כפר סבא',            phone: '09-8877265',   hours: 'א-ה 10:00-18:00 | ו 10:00-14:00', kosher: 'rabanut' },
  { name: 'חומוס אליהו כפר סבא הירוקה',     address: 'אנגל 78, כפר סבא',                            city: 'כפר סבא',            phone: '09-7436666',   hours: 'א-ה 10:00-19:30 | ו 10:00-15:00', kosher: 'rabanut' },
  { name: 'חומוס אליהו לוד',                 address: 'אליעזר בן הורקנוס 3, לוד',                    city: 'לוד',                phone: '08-6608876',   hours: 'א-ה 10:00-16:00 | ו 10:00-14:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו מודיעין עילית',       address: 'אבני נזר 46, מתחם גרין, מודיעין עילית',       city: 'מודיעין עילית',      phone: '079-6966969',  hours: 'א-ה 12:00-22:00 | ו סגור', kosher: 'badatz_kehilot' },
  { name: 'חומוס אליהו מודיעין קייזר',       address: 'עמק זבולון 24, קייזר סנטר, מודיעין',          city: 'מודיעין-מכבים-רעות', phone: '053-3444515',  hours: 'א-ד 11:00-19:00 | ה 11:00-20:00 | ו 09:00-15:00', kosher: 'badatz_beit_yosef' },
  { name: 'חומוס אליהו מישור אדומים',        address: 'דקלה 5, מעלה אדומים, מתחם צרפתי',            city: 'מעלה אדומים',        phone: '02-6455499',   hours: 'א-ה 10:00-19:00 | ו 10:00-13:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו מענית',               address: 'תחנת דלק דור אלון מענית',                     city: 'מענית',              phone: '04-6712552',   hours: 'א-ה 10:00-16:30 | ו 09:00-14:00', kosher: 'rabanut_mehadrin' },
  { name: 'חומוס אליהו נס ציונה',            address: 'אברהם פצורניק 5, פארק המדע, נס ציונה',        city: 'נס ציונה',           phone: '077-9386474',  hours: 'א-ה 09:30-18:30 | ו 09:30-15:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו נשר',                 address: 'המסילה 17, נשר',                               city: 'נשר',                phone: '04-6055552',   hours: 'א-ה 10:00-16:00 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו נתיבות',              address: 'בעלי המלאכה 7ב, נתיבות',                      city: 'נתיבות',             phone: '08-6644133',   hours: 'א-ה 10:30-20:00 | ו 10:30-13:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו נתניה',               address: 'שכטרמן 9, אזור התעשייה הישן, נתניה',          city: 'נתניה',              phone: '09-8992155',   hours: 'א-ה 08:30-19:00 | ו 08:30-12:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו עלי',                 address: 'מתחם תחנת הדלק עלי',                          city: 'עלי',                phone: '055-9499368',  hours: 'א-ה 11:00-20:00 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו פתח תקווה',           address: 'תוצרת הארץ 3, פתח תקווה',                     city: 'פתח תקווה',          phone: '077-9386212',  hours: 'א-ה 10:30-20:00 | ו 09:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו צמח טבריה',           address: 'צומת צמח',                                     city: 'מועצה אזורית עמק הירדן', phone: '04-8555100', hours: 'א-ה 10:00-18:00 | ו 10:00-14:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו צפת',                 address: 'דרך השוקולד 6, צפת',                          city: 'צפת',                phone: '04-7791937',   hours: 'א-ה 10:00-22:00 | ו 10:00-13:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו קדימה',               address: 'המעלית 2, קדימה',                              city: 'קדימה-צורן',         phone: '09-8933040',   hours: 'א-ה 11:00-17:00 | ו 09:30-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו קריית מוצקין',        address: 'מתחם האומנים, קריית מוצקין',                  city: 'קרית מוצקין',        phone: '077-3034157',  hours: 'א-ה 10:00-18:00 | ו 09:00-15:00', kosher: 'rabanut' },
  { name: 'חומוס אליהו קרית אונו',           address: 'השדרה האקדמאית 1, קרית אונו',                 city: 'קרית אונו',          phone: '03-6438467',   hours: 'א-ה 10:00-20:00 | ו 10:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו קרית אתא',            address: 'העצמאות 28, קריית אתא',                       city: 'קרית אתא',           phone: '04-9075555',   hours: 'א-ה 10:00-17:00 | ו 08:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו קרית גת',             address: 'שדרות צורן פינת הזרחן, קרית גת',              city: 'קרית גת',            phone: '08-8607706',   hours: 'א-ה 09:00-16:00 | ו 09:00-14:00', kosher: 'rabanut' },
  { name: 'חומוס אליהו קרית שמונה',          address: 'שד\' תל-חי 61, קריית שמונה',                  city: 'קרית שמונה',         phone: '04-6217602',   hours: 'א-ה 10:00-18:00 | ו 10:00-14:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו קרני שומרון',         address: 'שדרות רחבעם, קניון קרני שומרון',              city: 'קרני שומרון',        phone: '077-9386463',  hours: 'א-ה 10:00-21:00 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ראש העין',            address: 'זהרה אלפסיה 3, שפיר סנטר, ראש העין',         city: 'ראש העין',           phone: '077-9800491',  hours: 'א-ה 10:30-21:00 | ו 09:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ראש פינה',            address: 'התפוח 3, ראש פינה',                            city: 'ראש פינה',           phone: '04-8583310',   hours: 'א-ה 09:00-17:00 | ו 09:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ראשל"צ קניון הזהב',  address: 'קניון הזהב קומה 2, ראשון לציון',              city: 'ראשון לציון',        phone: '03-6893499',   hours: 'א-ה 10:00-21:00 | ו 10:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו ראשל"צ ראשונים',     address: 'שדרות נים 2, קניון עזריאלי ראשונים',         city: 'ראשון לציון',        phone: '03-9615677',   hours: 'א-ה 10:30-21:00 | ו 09:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו רחובות קניון עופר',  address: 'קניון עופר, רחובות',                           city: 'רחובות',             phone: '077-3034049',  hours: 'א-ה 09:30-22:00 | ו 09:30-15:30', kosher: 'badatz_beit_yosef' },
  { name: 'חומוס אליהו רמלה',               address: 'שדרות דוד רזיאל 1, קניון עזריאלי, רמלה',     city: 'רמלה',               phone: '08-6216216',   hours: 'א-ה 09:00-21:30 | ו 08:30-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו רמת גן קניון איילון', address: 'קניון איילון, רמת גן',                        city: 'רמת גן',             phone: '03-6441163',   hours: 'א-ה 10:00-21:30 | ו 10:00-15:00', kosher: 'chatam_sofer' },
  { name: 'חומוס אליהו רמת גן בורסה',       address: 'שלום זיסמן 3, מתחם הבורסה, רמת גן',          city: 'רמת גן',             phone: '03-7755731',   hours: 'א-ה 10:30-19:00 | ו 10:00-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו רעננה',              address: 'התעשייה 3, רעננה',                             city: 'רעננה',              phone: '09-8877013',   hours: 'א-ה 10:00-20:30 | ו 08:30-14:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו שדרות',              address: 'פריז 2, שדרות',                                city: 'שדרות',              phone: '077-9386450',  hours: 'א-ה 09:00-18:00 | ו 09:00-14:00', kosher: 'badatz_beit_yosef' },
  { name: 'חומוס אליהו שוהם',               address: 'עמק איילון 32, בית התרבות, שוהם',             city: 'שוהם',               phone: '03-7756882',   hours: 'א-ה 09:00-20:00 | ו 09:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו תל אביב היכל מנורה', address: 'יגאל אלון 51, תל אביב',                       city: 'תל אביב-יפו',        phone: '050-4020507',  hours: 'א-ה 09:00-19:30 | ו 09:00-14:30', kosher: 'badatz_beit_yosef' },
  { name: 'חומוס אליהו תל אביב שוק הפשפשים', address: 'עמיעד 14, תל אביב-יפו',                     city: 'תל אביב-יפו',        phone: '03-9599188',   hours: 'א-ה 10:30-19:00 | ו 10:00-15:30', kosher: 'mehadrin' },
  { name: 'חומוס אליהו תל אביב דיזינגוף סנטר', address: 'דיזינגוף סנטר בניין A קומה -1, תל אביב', city: 'תל אביב-יפו',        phone: '03-6358509',   hours: 'א-ה 10:00-20:00 | ו 09:00-15:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו תל אביב פלורנטין',   address: 'מעון 4, תל אביב',                             city: 'תל אביב-יפו',        phone: '03-6967700',   hours: 'א-ה 09:30-17:30 | ו 09:30-14:00', kosher: 'mehadrin' },
  { name: 'חומוס אליהו תל אביב שרונה',      address: 'שרונה מרקט, מגן קלמן אלוף 5, תל אביב',      city: 'תל אביב-יפו',        phone: '054-5723838',  hours: 'א-ה 09:00-17:00 | ו 08:00-17:00', kosher: 'rabanut' },
];

// ── Geocoder ──────────────────────────────────────────────────────────────────
async function geocodeNominatim(address, city) {
  const queries = [
    `${address}, ישראל`,
    `${city}, ישראל`,
  ];
  for (const q of queries) {
    await sleep(1200);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&countrycodes=il&format=json&limit=1&accept-language=he`;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      const data = await res.json();
      if (data[0]) {
        const precision = q.startsWith(address.slice(0, 5)) ? 'address' : 'city';
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), precision };
      }
    } catch (e) {
      console.warn(`Geocode failed: ${q} — ${e.message}`);
    }
  }
  return null;
}

// ── ID generator (same pattern as existing records) ───────────────────────────
function makeId(name) {
  return 'humus-eli-' + name
    .replace(/\s+/g, '-')
    .replace(/['"״]/g, '')
    .replace(/"/g, '');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const places = readJsonNoBom(PLACES_FILE);
  const restaurants = readJsonNoBom(RESTAURANTS_FILE);

  const existingIds = new Set(places.map(p => p.id));
  const existingPhones = new Set(places.map(p => p.phone).filter(Boolean));

  const today = new Date().toISOString().slice(0, 10);
  const newPlaces = [];
  const newRestaurants = [];

  for (const b of BRANCHES) {
    const id = makeId(b.name);

    // Deduplicate by ID or phone
    if (existingIds.has(id) || (b.phone && existingPhones.has(b.phone))) {
      console.log(`  SKIP (exists): ${b.name}`);
      continue;
    }

    console.log(`  Geocoding: ${b.name}`);
    const geo = await geocodeNominatim(b.address, b.city);
    if (!geo) {
      console.warn(`  WARN: no coordinates for ${b.name} — skipping`);
      continue;
    }

    const record = {
      id,
      name: b.name,
      type: 'restaurant',
      cityId: b.city,
      address: b.address,
      location: { latitude: geo.lat, longitude: geo.lng },
      source: 'manual',
      lastVerifiedAt: today,
      website: 'https://www.humus-eli-yahoo.com/restaurants/',
      sourceUrl: 'https://www.humus-eli-yahoo.com/restaurants/',
      sourceName: 'חומוס אליהו (אתר רשמי)',
      phone: b.phone,
      openingHours: b.hours,
      kosherType: b.kosher,
      category: 'parve',
      locationPrecision: geo.precision,
      extra: { dataSource: 'humus-eli-yahoo.com', gpsSource: geo.precision === 'address' ? 'nominatim_address' : 'nominatim_city' },
    };

    newPlaces.push(record);
    newRestaurants.push(record);
    existingIds.add(id);
    if (b.phone) existingPhones.add(b.phone);
    console.log(`  ✓ ${b.name} (${b.city}) — ${geo.precision}`);
  }

  if (newPlaces.length === 0) {
    console.log('\nאין רשומות חדשות — הכל כבר קיים.');
    return;
  }

  // Backup
  const ts = today.replace(/-/g, '');
  copyFileSync(PLACES_FILE, PLACES_FILE.replace('.json', `.pre-humus-full-${ts}.backup.json`));

  // Append
  writeFileSync(PLACES_FILE, JSON.stringify([...places, ...newPlaces], null, 2), 'utf8');
  writeFileSync(RESTAURANTS_FILE, JSON.stringify([...restaurants, ...newRestaurants], null, 2), 'utf8');

  console.log(`\n✅ נוספו ${newPlaces.length} רשומות חדשות`);
  console.log(`places.osm.json: ${places.length + newPlaces.length} רשומות`);
}

main().catch(e => { console.error(e); process.exit(1); });

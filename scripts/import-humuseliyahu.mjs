/**
 * Hummus Eliyahu kosher branches importer
 * Source: humus-eli-yahoo.com/restaurants/ — scraped 2026-07-15
 * 82 active branches (excluding: Coming Soon, Cyprus, temporarily closed)
 * Category: parve | kosherType: varies per branch
 */
import { readFileSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../src/data/generated');
const BOM = Buffer.from([0xEF, 0xBB, 0xBF]);

// kashrut string → enum
function mapKashrut(k) {
  if (!k) return 'kosher';
  const s = k.replace('כשרות:', '').trim();
  if (s.includes('בית יוסף') || s.includes('בדץ בית יוסף')) return 'badatz_beit_yosef';
  if (s.includes('קהילות קודש')) return 'badatz_beit_yosef';
  if (s.includes('לנדא') || s.includes('לנדה')) return 'rav_landa';
  if (s.includes('מהדרין') || s.includes('מחפוד') || s.includes('קהילות') ||
      s.includes('חתם סופר') || s.includes('רובין')) return 'mehadrin';
  if (s.includes('רבנות')) return 'rabanut';
  return 'kosher';
}

const BRANCHES = [
  // אלפבית
  { name: 'חומוס אליהו אור יהודה',          city: 'אור יהודה',        address: 'המפעל 13, אור יהודה',                                      phone: '03-5098537',  lat: 32.0361, lng: 34.8579, kashrut: 'כשרות: בד"צ בית יוסף' },
  { name: 'חומוס אליהו אזור',                city: 'אזור',             address: 'רחוב המצודה 8, אזור',                                      phone: '03-7731713',  lat: 31.9979, lng: 34.8234, kashrut: 'כשרות: רבנות' },
  { name: 'חומוס אליהו אילת',                city: 'אילת',             address: 'הבורסקאי 9, אזה"ת אילת',                                   phone: '08-9217177',  lat: 29.5577, lng: 34.9519, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו אלונים',              city: 'אלונים',           address: 'חוצות אלונים, צומת אלונים',                                phone: '04-6206309',  lat: 32.6875, lng: 35.1553, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו אריאל',               city: 'אריאל',            address: 'רמת הגולן 29, אריאל',                                      phone: '077-6495160', lat: 32.1056, lng: 35.1680, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו אשדוד',               city: 'אשדוד',            address: 'הבנאים 7, אשדוד',                                          phone: '08-6636368',  lat: 31.8041, lng: 34.6553, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו אשקלון',              city: 'אשקלון',           address: 'מרינה אשקלון',                                             phone: '08-6166444',  lat: 31.6696, lng: 34.5714, kashrut: 'כשרות: כשרות מהדרין הרב לנדא' },
  { name: 'חומוס אליהו באר טוביה',           city: 'באר טוביה',        address: 'א. תעשייה באר טוביה, R Center',                            phone: '08-6536330',  lat: 31.7256, lng: 34.7408, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו באר יעקב',            city: 'באר יעקב',         address: 'שא נס 17, קניון, באר יעקב',                               phone: '08-6271990',  lat: 31.9364, lng: 34.8388, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו באר שבע מצדה',        city: 'באר שבע',          address: 'דרך מצדה 6, מרכז הנגב, באר שבע',                          phone: '077-4015344', lat: 31.2530, lng: 34.7915, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו באר שבע פז צפון',     city: 'באר שבע',          address: 'שדרות ירושלים 2, שכונה ט\', באר שבע',                     phone: '08-9246661',  lat: 31.2600, lng: 34.7980, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו בית השיטה',           city: 'בית השיטה',        address: 'תחנת דלק דור אלון, כניסה לקיבוץ בית השיטה',               phone: '04-6332290',  lat: 32.5564, lng: 35.4292, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו בית שאן',             city: 'בית שאן',          address: 'היצירה 4, בית שאן',                                        phone: '04-6737373',  lat: 32.4983, lng: 35.4967, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו בית שמש',             city: 'בית שמש',          address: 'שד\' יגאל אלון 2, תחנת דלק פז, בית שמש',                  phone: '02-5782197',  lat: 31.7523, lng: 34.9902, kashrut: 'כשרות: בד"צ מהדרין בית שמש' },
  { name: 'חומוס אליהו בית שמש סאן מול',     city: 'בית שמש',          address: 'האמוראים 2, סאן מול, בית שמש',                            phone: '052-5118990', lat: 31.7450, lng: 34.9950, kashrut: 'כשרות: קהילות' },
  { name: 'חומוס אליהו בני ברק',             city: 'בני ברק',          address: 'הירקון 10, בני ברק',                                       phone: '03-5229909',  lat: 32.0835, lng: 34.8338, kashrut: 'כשרות: מחפוד' },
  { name: 'חומוס אליהו בנימינה',             city: 'בנימינה',          address: 'השריג 2, מתחם "הפיל", בנימינה',                           phone: '04-6561516',  lat: 32.5206, lng: 34.9440, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו בת ים',               city: 'בת ים',            address: 'הרב ניסנבאום 37, בת ים',                                   phone: '03-5093683',  lat: 32.0157, lng: 34.7524, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו גבעת שאול ירושלים',   city: 'ירושלים',          address: 'כנפי נשרים 24, גבעת שאול, ירושלים',                       phone: '077-2302445', lat: 31.7864, lng: 35.1878, kashrut: 'כשרות: הרב מחפוד' },
  { name: 'חומוס אליהו גוש עציון',           city: 'גוש עציון',        address: 'צומת גוש עציון',                                           phone: '02-5821655',  lat: 31.6300, lng: 35.1125, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו גן יבנה',             city: 'גן יבנה',          address: 'תחנת דלק דור אלון, גן יבנה',                               phone: '054-5852397', lat: 31.7916, lng: 34.7066, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו גשר הזיו',            city: 'גשר הזיו',         address: 'תחנת דלק דור אלון, כניסה לקיבוץ גשר הזיו',                phone: '04-6475581',  lat: 33.0400, lng: 35.2600, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו דימונה',              city: 'דימונה',           address: 'קניון פרץ סנטר, דימונה',                                   phone: '08-8666900',  lat: 31.0699, lng: 35.0327, kashrut: 'כשרות: בדץ בית יוסף' },
  { name: 'חומוס אליהו הרצליה פיתוח',        city: 'הרצליה',           address: 'משכית 32, הרצליה פיתוח',                                   phone: '09-9736397',  lat: 32.1655, lng: 34.8381, kashrut: 'כשרות: רבנות מהדרין' },
  { name: 'חומוס אליהו הרצליה שער העיר',     city: 'הרצליה',           address: 'בן גוריון 22, שער העיר, הרצליה',                          phone: '09-8877846',  lat: 32.1680, lng: 34.8450, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו חדרה',                city: 'חדרה',             address: 'מתחם מול החוף וילג\', חדרה',                              phone: '04-9080809',  lat: 32.4331, lng: 34.9188, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו חולון',               city: 'חולון',            address: 'גולדה מאיר 7, קניון עזריאלי, חולון',                       phone: '03-5088849',  lat: 32.0167, lng: 34.7781, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו טבריה עלית',          city: 'טבריה',            address: 'הניאון 4, תחנת הדלק ארזים, טבריה עילית',                  phone: '04-6999778',  lat: 32.7600, lng: 35.5250, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו טבריה הגליל',         city: 'טבריה',            address: 'רחוב הגליל 10, טבריה',                                     phone: '04-6277888',  lat: 32.7946, lng: 35.5303, kashrut: 'כשרות: כשר למהדרין' },
  { name: 'חומוס אליהו טירת הכרמל',          city: 'טירת הכרמל',       address: 'קרן היסוד 2, טירת הכרמל',                                 phone: '04-6951549',  lat: 32.7700, lng: 34.9700, kashrut: 'כשרות: רבנות' },
  { name: 'חומוס אליהו יוקנעם',              city: 'יוקנעם',           address: 'תחנת דלק, פארק תעשייה יוקנעם',                            phone: '04-9890916',  lat: 32.6567, lng: 35.1073, kashrut: 'כשרות: רבנות מהדרין' },
  { name: 'חומוס אליהו ים המלח עין בוקק',    city: 'ים המלח',          address: 'קניונית עין בוקק, ים המלח',                                phone: '08-6143083',  lat: 31.1800, lng: 35.3500, kashrut: 'כשרות: רבנות' },
  { name: 'חומוס אליהו ירושלים הדר תלפיות',  city: 'ירושלים',          address: 'גנרל פייר קניג 26, קניון הדר, ירושלים',                   phone: '02-6754455',  lat: 31.7500, lng: 35.2300, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו ירושלים מבשרת ציון',  city: 'מבשרת ציון',       address: 'הראל 1, מבשרת ציון',                                       phone: '050-9232233', lat: 31.8015, lng: 35.1507, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו ירושלים שורש',        city: 'שורש',             address: 'שואבה 1, שורש',                                            phone: '077-9800380', lat: 31.7900, lng: 35.0700, kashrut: 'כשרות: כשר מהדרין' },
  { name: 'חומוס אליהו ירושלים מחנה יהודה',  city: 'ירושלים',          address: 'השזיף 10, שוק מחנה יהודה, ירושלים',                       phone: '02-5492353',  lat: 31.7844, lng: 35.2129, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו ירושלים פסגת זאב',    city: 'ירושלים',          address: 'משה דיין 106, קניון לב הפסגה, ירושלים',                   phone: '02-5666882',  lat: 31.8244, lng: 35.2460, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו ירושלים יפו 33',      city: 'ירושלים',          address: 'רחוב יפו 33, ירושלים',                                     phone: '077-9386235', lat: 31.7810, lng: 35.2200, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו ירושלים הר חוצבים',  city: 'ירושלים',          address: 'קרית המדע 3, הר חוצבים, ירושלים',                         phone: '02-6200405',  lat: 31.7975, lng: 35.2290, kashrut: 'כשרות: רובין' },
  { name: 'חומוס אליהו ירושלים מלחה',        city: 'ירושלים',          address: 'קניון עזריאלי מלחה, ירושלים',                              phone: '02-6634577',  lat: 31.7460, lng: 35.1820, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו ירושלים סנטר 1',      city: 'ירושלים',          address: 'ירמיהו 43, קניון סנטר 1, ירושלים',                        phone: '077-4170400', lat: 31.7970, lng: 35.2080, kashrut: 'כשרות: קהילות' },
  { name: 'חומוס אליהו ירושלים קניון רמות',  city: 'ירושלים',          address: 'שדרות גולדה מאיר 255, קניון רמות, ירושלים',               phone: '073-3962571', lat: 31.8160, lng: 35.1860, kashrut: 'כשרות: קהילות' },
  { name: 'חומוס אליהו ישפרו סנטר מודיעין',  city: 'מודיעין',          address: 'שדרות המלאכות 121, ישפרו סנטר, מודיעין',                  phone: '08-6665959',  lat: 31.8966, lng: 35.0026, kashrut: 'כשרות: רבנות' },
  { name: 'חומוס אליהו כפר יונה',            city: 'כפר יונה',         address: 'דוד בן גוריון 1, קניון כפר יונה',                          phone: '077-9386471', lat: 32.3162, lng: 34.9375, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו כפר סבא עתיר ידע',   city: 'כפר סבא',          address: 'עתיר ידע 6, תחנת דלק TEN, כפר סבא',                       phone: '09-8877265',  lat: 32.1748, lng: 34.9058, kashrut: 'כשרות: רבנות' },
  { name: 'חומוס אליהו כפר סבא הירוקה',      city: 'כפר סבא',          address: 'אנגל 78, כפר סבא',                                         phone: '09-7436666',  lat: 32.1800, lng: 34.9100, kashrut: 'כשרות: רבנות' },
  { name: 'חומוס אליהו לוד',                 city: 'לוד',              address: 'אליעזר בן הורקנוס 3, לוד',                                 phone: '08-6608876',  lat: 31.9505, lng: 34.8890, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו מודיעין עילית',       city: 'מודיעין עילית',    address: 'אבני נזר 46, מתחם גרין, מודיעין עילית',                    phone: '079-6966969', lat: 31.9310, lng: 35.0530, kashrut: 'כשרות: בד"צ קהילות קודש קריית ספר' },
  { name: 'חומוס אליהו מודיעין קייזר',       city: 'מודיעין',          address: 'עמק זבולון 24, קייזר סנטר, מודיעין',                       phone: '053-3444515', lat: 31.8960, lng: 35.0090, kashrut: 'כשרות: בד"צ בית יוסף' },
  { name: 'חומוס אליהו מישור אדומים',        city: 'מעלה אדומים',      address: 'דקלה 5, מתחם צרפתי, מעלה אדומים',                         phone: '02-6455499',  lat: 31.7756, lng: 35.2966, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו מענית',               city: 'מענית',            address: 'תחנת דלק דור אלון, מענית',                                  phone: '04-6712552',  lat: 32.4700, lng: 35.0000, kashrut: 'כשרות: רבנות מהדרין' },
  { name: 'חומוס אליהו נס ציונה',            city: 'נס ציונה',         address: 'אברהם פצורניק 5, פארק המדע, נס ציונה',                    phone: '077-9386474', lat: 31.9283, lng: 34.7975, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו נשר',                 city: 'נשר',              address: 'המסילה 17, נשר',                                            phone: '04-6055552',  lat: 32.7700, lng: 35.0400, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו נתיבות',              city: 'נתיבות',           address: 'בעלי המלאכה 7ב, בית זגורי, נתיבות',                       phone: '08-6644133',  lat: 31.4213, lng: 34.5873, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו נתניה',               city: 'נתניה',            address: 'שכטרמן 9, אזור התעשייה הישן, נתניה',                      phone: '09-8992155',  lat: 32.3215, lng: 34.8532, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו עלי',                 city: 'עלי',              address: 'מתחם תחנת הדלק, עלי',                                      phone: '055-9499368', lat: 32.0680, lng: 35.2900, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו פתח תקווה',           city: 'פתח תקווה',        address: 'תוצרת הארץ 3, פתח תקווה',                                  phone: '077-9386212', lat: 32.0908, lng: 34.8828, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו צמח טבריה',           city: 'צמח',              address: 'צומת צמח',                                                 phone: '04-8555100',  lat: 32.7100, lng: 35.5700, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו צפת',                 city: 'צפת',              address: 'דרך השוקולד 6, צפת',                                       phone: '04-7791937',  lat: 32.9647, lng: 35.4956, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו קדימה',               city: 'קדימה',            address: 'המעלית 2, קדימה',                                          phone: '09-8933040',  lat: 32.2700, lng: 34.9100, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו קריית מוצקין',        city: 'קריית מוצקין',     address: 'מתחם האומנים, קריית מוצקין',                               phone: '077-3034157', lat: 32.8338, lng: 35.0809, kashrut: 'כשרות: רבנות' },
  { name: 'חומוס אליהו קריית אונו',          city: 'קריית אונו',        address: 'השדרה האקדמאית 1, קריית אונו',                             phone: '03-6438467',  lat: 32.0539, lng: 34.8681, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו קריית אתא',           city: 'קריית אתא',        address: 'העצמאות 28, קריית אתא',                                    phone: '04-9075555',  lat: 32.8094, lng: 35.1044, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו קריית גת',            city: 'קריית גת',         address: 'שדרות צורן, ליד HP, קריית גת',                             phone: '08-8607706',  lat: 31.6093, lng: 34.7699, kashrut: 'כשרות: רבנות' },
  { name: 'חומוס אליהו קריית שמונה',         city: 'קריית שמונה',      address: 'שד\' תל-חי 61, קריית שמונה',                              phone: '04-6217602',  lat: 33.2073, lng: 35.5706, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו קרני שומרון',         city: 'קרני שומרון',      address: 'קניון קרני שומרון, שדרות רחבעם',                           phone: '077-9386463', lat: 32.1719, lng: 35.1233, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו ראש העין',            city: 'ראש העין',         address: 'זהרה אלפסיה 3, שפיר סנטר, ראש העין',                     phone: '077-9800491', lat: 32.0951, lng: 34.9479, kashrut: 'כשרות: כשרות מהדרין' },
  { name: 'חומוס אליהו ראש פינה',            city: 'ראש פינה',         address: 'התפוח 3, ראש פינה',                                        phone: '04-8583310',  lat: 32.9722, lng: 35.5469, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו ראשון לציון קניון הזהב', city: 'ראשון לציון',   address: 'קניון הזהב, קומה 2, ראשון לציון',                          phone: '03-6893499',  lat: 31.9800, lng: 34.8125, kashrut: 'כשרות: מהדרין בית יוסף' },
  { name: 'חומוס אליהו ראשון לציון ראשונים', city: 'ראשון לציון',      address: 'שדרות נים 2, קניון עזריאלי ראשונים, ראשון לציון',          phone: '03-9615677',  lat: 31.9730, lng: 34.8075, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו רחובות',              city: 'רחובות',           address: 'קניון עופר, רחובות',                                        phone: '077-3034049', lat: 31.8928, lng: 34.8113, kashrut: 'כשרות: בד"צ בית יוסף' },
  { name: 'חומוס אליהו רמלה',                city: 'רמלה',             address: 'שדרות דוד רזיאל 1, קניון עזריאלי, רמלה',                  phone: '08-6216216',  lat: 31.9293, lng: 34.8724, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו רמת גן קניון איילון', city: 'רמת גן',           address: 'קניון איילון, רמת גן',                                      phone: '03-6441163',  lat: 32.0840, lng: 34.8260, kashrut: 'כשרות: חוג חתם סופר' },
  { name: 'חומוס אליהו רמת גן בורסה',        city: 'רמת גן',           address: 'שלום זיסמן 3, מתחם הבורסה, רמת גן',                       phone: '03-7755731',  lat: 32.0870, lng: 34.8340, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו רעננה',               city: 'רעננה',            address: 'התעשייה 3, רעננה',                                          phone: '09-8877013',  lat: 32.1848, lng: 34.8715, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו שדרות',               city: 'שדרות',            address: 'פריז 2, שדרות',                                            phone: '077-9386450', lat: 31.5290, lng: 34.6010, kashrut: 'כשרות: בדצ בית יוסף' },
  { name: 'חומוס אליהו שוהם',                city: 'שוהם',             address: 'עמק איילון 32, בית התרבות, שוהם',                          phone: '03-7756882',  lat: 31.9951, lng: 34.9398, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו תל אביב היכל מנורה',  city: 'תל אביב',          address: 'יגאל אלון 51, תל אביב',                                    phone: '050-4020507', lat: 32.0620, lng: 34.7898, kashrut: 'כשרות: בד"צ בית יוסף' },
  { name: 'חומוס אליהו תל אביב שוק הפשפשים', city: 'תל אביב',          address: 'עמיעד 14, שוק הפשפשים, תל אביב',                           phone: '03-9599188',  lat: 32.0564, lng: 34.7581, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו תל אביב דיזינגוף סנטר', city: 'תל אביב',        address: 'דיזינגוף סנטר, בניין A קומה -1, תל אביב',                 phone: '03-6358509',  lat: 32.0756, lng: 34.7735, kashrut: 'כשרות: מהדרין' },
  { name: 'חומוס אליהו תל אביב פלורנטין',    city: 'תל אביב',          address: 'מעון 4, פלורנטין, תל אביב',                                phone: '03-6967700',  lat: 32.0560, lng: 34.7724, kashrut: 'כשרות: מהדרין בד"צ' },
  { name: 'חומוס אליהו תל אביב שרונה',       city: 'תל אביב',          address: 'מגן קלמן אלוף 5, שרונה מרקט, תל אביב',                   phone: '054-5723838', lat: 32.0699, lng: 34.7880, kashrut: 'כשרות: רבנות' },
];

function makeId(name) {
  return 'humuseliyahu-' + createHash('md5').update(name).digest('hex').slice(0, 8);
}

function buildPlace(b) {
  return {
    id: makeId(b.name),
    name: b.name,
    type: 'restaurant',
    cityId: b.city,
    address: b.address,
    phone: b.phone,
    location: { latitude: b.lat, longitude: b.lng },
    locationPrecision: 'city',
    website: 'https://www.humus-eli-yahoo.com',
    category: 'parve',
    kosherType: mapKashrut(b.kashrut),
    source: 'manual',
    lastVerifiedAt: '2026-07-15',
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

console.log('=== Hummus Eliyahu Import ===');
const places = BRANCHES.map(buildPlace);
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

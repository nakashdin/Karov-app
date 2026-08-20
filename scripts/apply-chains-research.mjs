import fs from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

// ============================================================
// CHAINS WORKFLOW RESULTS — wf_09f6474f-493 — 208 updates, 86 deletes
// ============================================================

const UPDATES = [
  // ג'פניקה (19)
  { id: "manual-japanika-nahariya",       kosherType: "rabanut_mekomi", certifiedBy: "רבנות נהריה",                                 category: "meat" },
  { id: "manual-japanika-nes-ziona",      kosherType: "rabanut_mekomi", certifiedBy: "רבנות נס ציונה",                              category: "meat" },
  { id: "manual-japanika-kiryat-gat",     kosherType: "rabanut_mekomi", certifiedBy: "הרבנות הראשית קרית גת",                       category: "meat" },
  { id: "manual-japanika-raanana",        kosherType: "rabanut_mekomi", certifiedBy: "רבנות רעננה",                                 category: "meat" },
  { id: "manual-japanika-rishon",         kosherType: "rabanut_mekomi", certifiedBy: "רבנות ראשון לציון",                           category: "meat" },
  { id: "manual-japanika-haifa",          kosherType: "rabanut_mekomi", certifiedBy: "בהשגחת הרבנות מועצה אזורית חוף הכרמל",       category: "meat" },
  { id: "manual-japanika-netivot",        kosherType: "rabanut_mekomi", certifiedBy: "רבנות נתיבות",                                category: "meat" },
  { id: "manual-japanika-ramle",          kosherType: "rabanut_mekomi", certifiedBy: "רבנות רמלה",                                  category: "meat" },
  { id: "manual-japanika-ariel",          kosherType: "rabanut_mekomi", certifiedBy: "רבנות אריאל",                                 category: "meat" },
  { id: "manual-japanika-rosh-haayin",    kosherType: "rabanut_mekomi", certifiedBy: "רבנות ראש העין",                              category: "meat" },
  { id: "manual-japanika-kiryat-motzkin", kosherType: "rabanut_mekomi", certifiedBy: "רבנות מוצקין",                                category: "meat" },
  { id: "manual-japanika-afula",          kosherType: "rabanut_mekomi", certifiedBy: "רבנות עפולה",                                 category: "meat" },
  { id: "manual-japanika-ashkelon",       kosherType: "rabanut_mekomi", certifiedBy: "רבנות אשקלון",                                category: "meat" },
  { id: "manual-japanika-rosh-pina",      kosherType: "rabanut_mekomi", certifiedBy: "רבנות ראש פינה",                              category: "meat" },
  { id: "manual-japanika-checkpoint",     kosherType: "rabanut_mekomi", certifiedBy: "רבנות חיפה",                                  category: "meat" },
  { id: "manual-japanika-jerusalem",      kosherType: "rabanut_mekomi", certifiedBy: "רבנות ירושלים",                               category: "meat" },
  { id: "manual-japanika-ayalon",         kosherType: "rabanut_mekomi", certifiedBy: "רבנות רמת גן",                                category: "meat" },
  { id: "manual-japanika-herzliya",       kosherType: "rabanut_mekomi", certifiedBy: "רבנות הרצליה",                                category: "meat" },
  { id: "manual-japanika-bursa",          kosherType: "rabanut_mekomi", certifiedBy: "רבנות רמת גן",                                category: "meat" },

  // בורגר סטיישן (17)
  { id: "manual-burger-station-tlv-dizengoff", kosherType: "rabanut_tel_aviv", certifiedBy: "רבנות תל אביב-יפו",               category: "meat" },
  { id: "manual-burger-station-ramat-gan",     kosherType: "rabanut_mekomi",   certifiedBy: "רבנות רמת גן",                    category: "meat" },
  { id: "manual-burger-station-holon",         kosherType: "rabanut_mekomi",   certifiedBy: "רבנות חולון",                     category: "meat" },
  { id: "manual-burger-station-bat-yam",       kosherType: "rabanut_mekomi",   certifiedBy: "רבנות בת ים",                     category: "meat" },
  { id: "manual-burger-station-herzliya",      kosherType: "rabanut_mekomi",   certifiedBy: "רבנות הרצליה",                    category: "meat" },
  { id: "manual-burger-station-kfar-saba",     kosherType: "rabanut_mekomi",   certifiedBy: "רבנות כפר סבא",                   category: "meat" },
  { id: "manual-burger-station-raanana",       kosherType: "rabanut_mekomi",   certifiedBy: "רבנות רעננה",                     category: "meat" },
  { id: "manual-burger-station-nes-ziona",     kosherType: "rabanut_mekomi",   certifiedBy: "רבנות נס ציונה",                  category: "meat" },
  { id: "manual-burger-station-rishon",        kosherType: "rabanut_mekomi",   certifiedBy: "רבנות ראשון לציון",               category: "meat" },
  { id: "manual-burger-station-pt",            kosherType: "rabanut_mekomi",   certifiedBy: "רבנות פתח תקווה",                 category: "meat" },
  { id: "manual-burger-station-rehovot",       kosherType: "rabanut_mekomi",   certifiedBy: "רבנות רחובות",                    category: "meat" },
  { id: "manual-burger-station-netanya1",      kosherType: "rabanut_mekomi",   certifiedBy: "רבנות נתניה",                     category: "meat" },
  { id: "manual-burger-station-netanya2",      kosherType: "rabanut_mekomi",   certifiedBy: "רבנות נתניה",                     category: "meat" },
  { id: "manual-burger-station-modiin",        kosherType: "rabanut_mekomi",   certifiedBy: "רבנות מודיעין-מכבים-רעות",        category: "meat" },
  { id: "manual-burger-station-hadera",        kosherType: "rabanut_mekomi",   certifiedBy: "רבנות חדרה",                      category: "meat" },
  { id: "manual-burger-station-rosh-haayin",   kosherType: "rabanut_mekomi",   certifiedBy: "רבנות ראש העין",                  category: "meat" },
  { id: "manual-burger-station-ashkelon",      kosherType: "rabanut_mekomi",   certifiedBy: "רבנות אשקלון",                    category: "meat" },

  // פלאפל בריבוע (14 updates)
  { id: "manual-falafel-baribua-beit-oved",        kosherType: "rabanut_mekomi", certifiedBy: "רבנות גן רווה",          category: "parve" },
  { id: "manual-falafel-baribua-givat-shmuel",     kosherType: "rabanut_mekomi", certifiedBy: "רבנות גבעת שמואל",       category: "meat"  },
  { id: "manual-falafel-baribua-holon",            kosherType: "rabanut_mekomi", certifiedBy: "רבנות חולון",             category: "meat"  },
  { id: "manual-falafel-baribua-yavne",            kosherType: "rabanut_mekomi", certifiedBy: "רבנות יבנה",              category: "meat"  },
  { id: "manual-falafel-baribua-ramat-gan",        kosherType: "rabanut_mekomi", certifiedBy: "רבנות רמת גן",            category: "meat"  },
  { id: "manual-falafel-baribua-netanya",          kosherType: "rabanut_mekomi", certifiedBy: "רבנות נתניה",             category: "meat"  },
  { id: "manual-falafel-baribua-shoham",           kosherType: "rabanut_mekomi", certifiedBy: "רבנות שהם",               category: "dairy" },
  { id: "manual-falafel-baribua-rosh-haayin",      kosherType: "rabanut_mekomi", certifiedBy: "רבנות ראש העין",          category: "meat"  },
  { id: "manual-falafel-baribua-rishon-rothschild",kosherType: "rabanut_mekomi", certifiedBy: "רבנות ראשון לציון",       category: "meat"  },
  { id: "manual-falafel-baribua-rehovot",          kosherType: "rabanut_mekomi", certifiedBy: "רבנות רחובות",            category: "meat"  },
  { id: "manual-falafel-baribua-ramat-hasharon",   kosherType: "rabanut_mekomi", certifiedBy: "רבנות רמת השרון",         category: "meat"  },
  { id: "manual-falafel-baribua-tzoran",           kosherType: "rabanut_mekomi", certifiedBy: "רבנות קדימה-צורן",        category: "meat"  },
  { id: "manual-falafel-baribua-paz-rupin",        kosherType: "mehadrin",       certifiedBy: "רבנות עמק חפר",           category: "parve" },
  { id: "manual-falafel-baribua-paz-nachlat-yehuda",kosherType:"rabanut_mekomi", certifiedBy: "רבנות ראשון לציון",       category: "parve" },

  // ברגר קינג (12)
  { id: "manual-bk-ashdod",      kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-herzliya",    kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-hod-hasharon",kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-hadera",      kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-yehud",       kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-petah-tikva", kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-netanya",     kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-raanana",     kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-eilat",       kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-holon",       kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-tlv-azrieli", kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },
  { id: "manual-bk-ben-gurion",  kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },

  // השניצליה (1 update)
  { id: "manual-hashnitzelia-tlv-menora", kosherType: "rabanut_mekomi", certifiedBy: "רבנות", category: "meat" },

  // ביגה (7 updates)
  { id: "manual-biga-haifa-azrieli",    kosherType: "rabanut_mekomi", certifiedBy: "רבנות חיפה",         category: "dairy" },
  { id: "manual-biga-haifa-grand-kanyon",kosherType:"rabanut_mekomi", certifiedBy: "רבנות חיפה",         category: "dairy" },
  { id: "manual-biga-kiryat-haim",      kosherType: "rabanut_mekomi", certifiedBy: "רבנות חיפה",         category: "dairy" },
  { id: "manual-biga-karmiel",          kosherType: "rabanut",        certifiedBy: "רבנות כרמיאל",       category: "dairy" },
  { id: "manual-biga-sha-ar-tzafon",    kosherType: "rabanut_mekomi", certifiedBy: "הרב דיסקין",          category: "dairy" },
  { id: "manual-biga-ashdod",           kosherType: "rabanut",        certifiedBy: "רבנות אשדוד",         category: "dairy" },
  { id: "manual-biga-kiryat-tavon",     kosherType: "rabanut_mekomi", certifiedBy: "רבנות קרית טבעון",   category: "dairy" },

  // ריבר (9)
  { id: "manual-river-malha",      kosherType: "kosher", category: "parve" },
  { id: "manual-river-rishon",     kosherType: "kosher", category: "parve" },
  { id: "manual-river-yavne",      kosherType: "kosher", category: "parve" },
  { id: "manual-river-holon",      kosherType: "kosher", category: "parve" },
  { id: "manual-river-herzliya",   kosherType: "kosher", category: "parve" },
  { id: "manual-river-beer-sheva", kosherType: "kosher", category: "parve" },
  { id: "manual-river-ashkelon",   kosherType: "kosher", category: "parve" },
  { id: "manual-river-or-yehuda",  kosherType: "kosher", category: "parve" },
  { id: "osm-way-1049269959",      kosherType: "kosher", category: "parve" },

  // רפידוס (4)
  { id: "manual-rapidos-netanya",  kosherType: "rabanut_mekomi", certifiedBy: "רבנות נתניה",        category: "meat" },
  { id: "manual-rapidos-herzliya", kosherType: "rabanut_mekomi", certifiedBy: "רבנות הרצליה",       category: "meat" },
  { id: "manual-rapidos-rishon",   kosherType: "rabanut_mekomi", certifiedBy: "רבנות ראשון לציון",  category: "meat" },
  { id: "manual-rapidos-nahariya", kosherType: "rabanut_mekomi", certifiedBy: "רבנות נהריה",        category: "meat" },

  // ווק טו ווק (4)
  { id: "manual-wok-to-walk-tlv",   kosherType: "rabanut_mekomi", certifiedBy: "רבנות תל אביב",       category: "meat" },
  { id: "manual-wok-to-walk-pt",    kosherType: "rabanut_mekomi", certifiedBy: "רבנות פתח תקווה",     category: "meat" },
  { id: "manual-wok-to-walk-jrm",   kosherType: "rabanut_mekomi", certifiedBy: "רבנות ירושלים",       category: "meat" },
  { id: "manual-wok-to-walk-rishon", kosherType: "rabanut_mekomi", certifiedBy: "רבנות ראשון לציון",  category: "meat" },

  // סלון יווני (5)
  { id: "manual-salon-yevani-herzliya",  kosherType: "rabanut_mekomi", certifiedBy: "רבנות שוהם",                 category: "dairy" },
  { id: "manual-salon-yevani-rishon",    kosherType: "rabanut_mekomi", certifiedBy: "הרבנות הראשית לישראל",       category: "dairy" },
  { id: "manual-salon-yevani-zichron",   kosherType: "rabanut_mekomi", certifiedBy: "הרבנות הראשית לישראל",       category: "dairy" },
  { id: "manual-salon-yevani-or-yehuda", kosherType: "rabanut_mekomi", certifiedBy: "הרבנות הראשית לישראל",       category: "dairy" },
  { id: "manual-salon-yevani-jrm",       kosherType: "rabanut_mekomi", certifiedBy: "הרבנות הראשית לישראל",       category: "dairy" },

  // קפיט (4)
  { id: "manual-caffit-emek-refaim",    kosherType: "rabanut_mekomi", certifiedBy: "רבנות ירושלים",    category: "dairy", phone: "02-5635284",  openingHours: "א'-ד' 07:30-24:00, ו' עד 16:00, מוצ\"ש 20:30-24:00" },
  { id: "manual-caffit-botanical-garden",kosherType: "rabanut_mekomi", certifiedBy: "רבנות ירושלים",   category: "dairy", phone: "02-6480003",  openingHours: "א'-ה' 08:30-23:00, ו'/ערב חג 08:30-15:00, מוצ\"ש/חג סגור" },
  { id: "manual-caffit-maaleh-adumim",  kosherType: "rabanut_mekomi", certifiedBy: "רבנות מעלה אדומים",category: "dairy", phone: "02-5662208",  openingHours: "א'-ה' 08:00-23:00, ו'/ערב חג 08:00-13:00, מוצ\"ש שעה אחרי צאת שבת עד 23:00" },
  { id: "manual-caffit-modiin",         kosherType: "rabanut_mekomi", certifiedBy: "רבנות מודיעין",    category: "dairy", phone: "08-8699623",  openingHours: "א'-ה' 09:30-23:00, ו'/ערב חג 08:30-14:30, מוצ\"ש/חג סגור" },

  // פלאפל ג'ינה (1 update)
  { id: "manual-falafel-gina-tlv-shokan", kosherType: "kosher", category: "parve", phone: "03-6831123" },

  // מקסיקנה (4 updates)
  { id: "manual-mexicana-tlv-ramat-hahyal", kosherType: "kosher", category: "meat", phone: "1700500993" },
  { id: "manual-mexicana-tlv-sarona",       kosherType: "kosher", category: "meat", phone: "1700500993" },
  { id: "manual-mexicana-pt",               kosherType: "kosher", category: "meat", phone: "1700500993" },
  { id: "manual-mexicana-rishonim",         kosherType: "kosher", category: "meat", phone: "1700500993" },

  // פוקישופ (2 updates)
  { id: "manual-pokeshop-tlv-herzl", kosherType: "rabanut_tel_aviv", certifiedBy: "רבנות תל אביב", category: "parve", phone: "03-6530883",  openingHours: "א-ה 11:00-23:00" },
  { id: "manual-pokeshop-netanya",   kosherType: "rabanut_mekomi",   certifiedBy: "רבנות נתניה",   category: "parve", phone: "074-7449044", openingHours: "א-ה 11:00-17:00" },

  // סחוט (11 updates)
  { id: "manual-freshop-tlv-weizmann",   kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-rehovot",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-pt-ofr",         kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-pt-kfar-ganim",  kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-bat-yam",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-haifa-sinmol",   kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-haifa-azrieli",  kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-beersheva-grand",kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-ashdod-city",    kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-ramla",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-freshop-safed",          kosherType: "rabanut_mekomi", category: "dairy" },

  // בורגר ראנץ' (6)
  { id: "manual-br-hod-hasharon", kosherType: "rabanut_mekomi", certifiedBy: "רבנות הוד השרון",     category: "meat" },
  { id: "manual-br-hadera",       kosherType: "rabanut_mekomi", certifiedBy: "רבנות חדרה",           category: "meat" },
  { id: "manual-br-haifa-azrieli",kosherType: "rabanut_mekomi", certifiedBy: "רבנות חיפה",           category: "meat" },
  { id: "manual-br-krayot",       kosherType: "rabanut_mekomi", certifiedBy: "רבנות קריית ביאליק",   category: "meat" },
  { id: "manual-br-raanana",      kosherType: "rabanut_mekomi", certifiedBy: "רבנות רעננה",           category: "meat" },
  { id: "manual-br-tlv-menorah",  kosherType: "rabanut_tel_aviv", certifiedBy: "רבנות תל אביב יפו",  category: "meat" },

  // לנדוור (2 remaining)
  { id: "landwer-airport-city", kosherType: "rabanut_mekomi", certifiedBy: "רבנות לוד",       category: "dairy", phone: "03-8011111",  openingHours: "ראשון-חמישי: 08:30-22:30 | שישי: 08:00-16:00 | שבת: 08:00-22:30" },
  { id: "landwer-beer-sheva",   kosherType: "rabanut_mekomi", certifiedBy: "רבנות באר שבע",   category: "dairy", phone: "08-9332993",  openingHours: "ראשון-חמישי: 09:00-23:00 | שישי: 08:00-16:00 | שבת: 21:00-00:00" },

  // פסטיטו (5)
  { id: "manual-pastito-tlv-begin",    kosherType: "rabanut_tel_aviv", certifiedBy: "רבנות תל אביב",    category: "dairy", phone: "054-9964414", openingHours: "א'-ה': 10:30-21:30 | שישי: סגור | שבת: סגור" },
  { id: "manual-pastito-tlv-dizengoff",kosherType: "rabanut_tel_aviv", certifiedBy: "רבנות תל אביב",    category: "dairy", phone: "077-3034029", openingHours: "א'-ה': 11:00-22:00 | שישי: 10:00-16:00 | מוצ\"ש: סגור" },
  { id: "manual-pastito-givatayim",    kosherType: "rabanut_mekomi",   certifiedBy: "רבנות פתח תקווה",  category: "dairy", phone: "03-6969264",  openingHours: "א'-ה': 09:00-22:00 | שישי: 09:00-15:00 | מוצ\"ש: 21:00-23:00" },
  { id: "manual-pastito-pt",           kosherType: "rabanut_mekomi",   certifiedBy: "רבנות פתח תקווה",  category: "dairy", phone: "03-5663927",  openingHours: "א'-ד': 10:30-21:00 | ה': 10:30-23:00 | שישי: 11:00-14:00 | מוצ\"ש: 21:00-23:00" },
  { id: "manual-pastito-ramla",        kosherType: "rabanut_mekomi",   certifiedBy: "רבנות רמלה",       category: "dairy", phone: "077-880-1710", openingHours: "א'-ה': 10:30-22:00 | שישי: 10:30-14:30 | מוצ\"ש: 18:30-23:00" },

  // ארומה (82 remaining branches)
  { id: "manual-aroma-jerusalem-arena",       kosherType: "rabanut",        certifiedBy: "ארגון רבני צהר",  category: "dairy" },
  { id: "manual-aroma-haifa-lev-hamifratz",   kosherType: "rabanut",        certifiedBy: "ארגון רבני צהר",  category: "dairy" },
  { id: "manual-aroma-bat-yam-rothschild",    kosherType: "rabanut",        certifiedBy: "ארגון רבני צהר",  category: "dairy" },
  { id: "manual-aroma-bilu-center",           kosherType: "rabanut",        certifiedBy: "ארגון רבני צהר",  category: "dairy" },
  { id: "manual-aroma-hebrew-uni-givat-ram",  kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-maaleh-adumim",         kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-modiin-azrieli",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-emek-refaim",           kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-hadar-jerusalem",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-malha-jerusalem",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-mamilla",               kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-talpiot-hatasia",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bgu-library",           kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bgu-kiosk",             kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bgu-main",              kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bs-grand",              kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-kfar-aza",              kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-ashdod-star",           kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-arad",                  kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tzomset-urim",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-ashkelon-giron",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bs-negev",              kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-ashdod-simol",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-kiryat-gat",            kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bs-gov-quarter",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bs-reger",              kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bs-tet",                kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bs-central-station",    kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-migdal-haemek-big",     kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-pardes-hana-big",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-beit-shean",            kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tiberias-bazalt",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-maalot",                kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-or-akiva-nofyam",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-afula-bashdara",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tirat-carmel",          kosherType: "mehadrin",       category: "dairy" },
  { id: "manual-aroma-or-akiva-orot",         kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-hadera-shaarei",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-ramat-gan-ayalon",      kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-pt-big-avnat",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-bar-ilan",              kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-pt-em-hamoshavot",      kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-ramat-gan-bursa",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tel-hashomer-hospital", kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-pt-global-towers",      kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-hod-hasharon-mix",      kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-kfar-saba-g",           kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-or-yehuda-azrieli",     kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-givat-shmuel-paz",      kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tzomset-ruppin",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-givatayim",             kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-netanya-sharon",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-netanya-naeimi",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-yehud",                 kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-netanya-ir-yamim",      kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-kiryat-ono",            kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-raanana-rananeem",      kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-herzliya-kiosk",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-assaf-harofe",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-rl-court",              kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-rehovot-mix",           kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-nes-ziona",             kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-ramla-azrieli",         kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-beer-yaakov",           kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-rl-zahav",              kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-rehovot-kanyon",        kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-rl-shaar-rishon",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-weizmann-ichilov",  kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-tlv-mall",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-beit-anu",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-begin",             kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-azrieli",           kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-atidim",            kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-haifa-uni",             kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tiberias-big",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-holon-mall",            kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-broshim",           kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-karlibah",          kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-london-ministor",   kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-alon-towers",       kosherType: "rabanut_mekomi", category: "dairy" },
  { id: "manual-aroma-tlv-ramat-hahayyal",    kosherType: "rabanut_mekomi", category: "dairy" },
];

// Build update lookup map
const UPDATE_MAP = new Map(UPDATES.map(u => [u.id, u]));

// ============================================================
// DELETIONS (86)
// ============================================================
const DELETE_IDS = new Set([
  // שניצל 20 טעמים (16) — no kosher cert on official site
  "manual-shnitzel20-maaleh-adumim","manual-shnitzel20-pt","manual-shnitzel20-kiryat-bialik",
  "manual-shnitzel20-netanya-naimi","manual-shnitzel20-netanya-central","manual-shnitzel20-raanana",
  "manual-shnitzel20-herzliya","manual-shnitzel20-holon","manual-shnitzel20-harish",
  "manual-shnitzel20-yokneam","manual-shnitzel20-haifa","manual-shnitzel20-afula",
  "manual-shnitzel20-karmiel","manual-shnitzel20-or-akiva","manual-shnitzel20-zichron",
  "manual-shnitzel20-pardes-hana",

  // פלאפל בריבוע (2) — cert 404 or missing
  "manual-falafel-baribua-rishon-factory","manual-falafel-baribua-kfar-yarok",

  // השניצליה (11) — old/closed or no cert on branch page
  "osm-node-5176327119","osm-node-6014904184",
  "manual-hashnitzelia-kiryat-ata","manual-hashnitzelia-nesher","manual-hashnitzelia-tirat-carmel",
  "manual-hashnitzelia-maalot","manual-hashnitzelia-kiryat-shmona","manual-hashnitzelia-ariel",
  "manual-hashnitzelia-tlv-karlbach","manual-hashnitzelia-katzrin","manual-hashnitzelia-safed",

  // ביגה (4) — not found or explicitly non-kosher
  "osm-node-11542534410","manual-biga-nof-hagalil","manual-biga-kfar-saba-green","manual-biga-rehovot",

  // רפידוס (2) — not listed or no cert
  "manual-rapidos-pt","manual-rapidos-tlv-menora",

  // ווק טו ווק (1)
  "manual-wok-to-walk-netanya",

  // ווק אווי (3) — open Shabbat / no cert
  "manual-wok-away-bat-yam","manual-wok-away-pt","manual-wok-away-eilat",

  // האק (2) — no official website
  "manual-hak-tlv","manual-hak-kiryat-ono",

  // גו נודלס (5) — empty placeholder site
  "manual-go-noodles-tlv-ben-gavir","manual-go-noodles-tlv-yitzhak-sade",
  "manual-go-noodles-tlv-yehuda-halevi","manual-go-noodles-raanana","manual-go-noodles-pt",

  // פלאפל ג'ינה (5) — only Shoken branch still active
  "manual-falafel-gina-tlv-begin","manual-falafel-gina-jaffa","manual-falafel-gina-holon",
  "manual-falafel-gina-ramat-gan","manual-falafel-gina-rishon",

  // מקסיקנה (3) — no cert or not listed
  "manual-mexicana-glilot","manual-mexicana-rishon-cinema","manual-mexicana-rehovot",

  // שניצל קומפני (8) — no cert on official site
  "manual-shnitzel-company-tlv-allon","manual-shnitzel-company-tlv-sarona",
  "manual-shnitzel-company-tlv-ramat-hahyal","manual-shnitzel-company-ramat-gan",
  "manual-shnitzel-company-bb","manual-shnitzel-company-herzliya",
  "manual-shnitzel-company-raanana","manual-shnitzel-company-holon",

  // פוקישופ (3) — not in official store list
  "manual-pokeshop-herzliya","manual-pokeshop-raanana","manual-pokeshop-ramat-gan",

  // סחוט (2) — not listed or no cert
  "manual-freshop-rishon-zahav","manual-freshop-beersheva-negev",

  // קפה ג'ו (10) — website is capsule store, no physical branch data
  "manual-cafe-joe-sheba","manual-cafe-joe-marom-nave","manual-cafe-joe-haifa-uni",
  "manual-cafe-joe-holon","manual-cafe-joe-rishon","manual-cafe-joe-hod-hasharon",
  "manual-cafe-joe-rg-hilazon","manual-cafe-joe-ramla","manual-cafe-joe-tzometsram",
  "manual-cafe-joe-rg-bengurion",

  // פסטיטו (2) — open Shabbat or no cert
  "manual-pastito-nof-hagalil","manual-pastito-sderot",

  // פלאפל חתוכה (6) — no official website
  "manual-falafel-hatuka-pt-hahistadrut","manual-falafel-hatuka-pt-lev-hair",
  "manual-falafel-hatuka-rosh-haayin","manual-falafel-hatuka-raanana",
  "manual-falafel-hatuka-rishon","manual-falafel-hatuka-tlv",

  // ארומה (1) — open Shabbat / no cert
  "manual-aroma-ramat-hasharon-big",
]);

// ============================================================
// Apply
// ============================================================
let updatedCount = 0;
let deletedCount = 0;
let notFoundUpdates = [];
let notFoundDeletes = [];

const result = data
  .filter(p => {
    if (DELETE_IDS.has(p.id)) { deletedCount++; return false; }
    return true;
  })
  .map(p => {
    const upd = UPDATE_MAP.get(p.id);
    if (!upd) return p;
    const next = { ...p };
    // Always overwrite kosherType and category
    next.kosherType = upd.kosherType;
    if (upd.category) next.category = upd.category;
    // Always overwrite certifiedBy if provided (even if empty string — skip empty)
    if (upd.certifiedBy !== undefined && upd.certifiedBy !== '') next.certifiedBy = upd.certifiedBy;
    // Only add phone/openingHours if not already set
    if (upd.phone && !p.phone) next.phone = upd.phone;
    if (upd.openingHours && !p.openingHours) next.openingHours = upd.openingHours;
    updatedCount++;
    return next;
  });

// Check for IDs not found
for (const [id] of UPDATE_MAP) {
  if (!data.find(p => p.id === id)) notFoundUpdates.push(id);
}
for (const id of DELETE_IDS) {
  if (!data.find(p => p.id === id)) notFoundDeletes.push(id);
}

fs.writeFileSync(DATA_PATH, JSON.stringify(result, null, 2), 'utf8');

console.log(`✅ Deleted:  ${deletedCount}`);
console.log(`✅ Updated:  ${updatedCount}`);
console.log(`📊 Total remaining: ${result.length}`);
if (notFoundUpdates.length) console.log(`⚠️  Update IDs not found (${notFoundUpdates.length}):`, notFoundUpdates.join(', '));
if (notFoundDeletes.length) console.log(`⚠️  Delete IDs not found (${notFoundDeletes.length}):`, notFoundDeletes.join(', '));

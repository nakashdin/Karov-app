import fs from 'fs';

const DATA_PATH = './src/data/generated/places.osm.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const WEBSITE = 'https://b-fresh.org.il';

const branches = [
  // ===== תל אביב =====
  {
    id: 'manual-b-fresh-rakevet-savidor',
    name: 'B-Fresh רכבת סבידור',
    kosherType: 'rabanut',
    address: 'רכבת סבידור מרכז, תל אביב',
    lat: 32.0913, lon: 34.7813,
    phone: '0779386119',
    hours: "א'-ה' 08:30-20:00 | שישי 08:30-12:00 | שבת סגור",
  },
  {
    id: 'manual-b-fresh-ichilov',
    name: 'B-Fresh איכילוב',
    kosherType: 'rabanut',
    address: 'וויצמן 6, תל אביב',
    lat: 32.0756, lon: 34.7851,
    phone: '0773034016',
    hours: "א' 09:00-18:00 | ב' 14:00-18:00 | ג'-ה' 09:00-18:00 | שישי 09:00-14:00 | שבת סגור",
  },
  {
    id: 'manual-b-fresh-azrieli-ta',
    name: 'B-Fresh קניון עזריאלי תל אביב',
    kosherType: 'rabanut',
    address: 'דרך מנחם בגין 132, תל אביב',
    lat: 32.0716, lon: 34.7926,
    phone: '0779386124',
    hours: "א'-ה' 09:30-22:00 | שישי 09:30-15:00 | שבת סגור",
  },
  {
    id: 'manual-b-fresh-dizengoff',
    name: 'B-Fresh דיזינגוף סנטר',
    kosherType: 'rabanut',
    address: 'דיזינגוף 50, תל אביב',
    lat: 32.0741, lon: 34.7748,
    phone: '0779386121',
    hours: "א'-ה' 09:30-21:30 | שישי 09:00-15:00 | שבת סגור",
  },
  // ===== רמת גן / גבעתיים / גב"ש =====
  {
    id: 'manual-b-fresh-bialik-ramat-gan',
    name: 'B-Fresh ביאליק רמת גן',
    kosherType: 'mehadrin',
    address: 'ביאליק 77, רמת גן',
    lat: 32.0816, lon: 34.8248,
    phone: '035515135',
    hours: "א'-ה' 09:00-21:00 | שישי 09:00-14:00 | שבת סגור",
  },
  {
    id: 'manual-b-fresh-azrieli-givatayim',
    name: 'B-Fresh קניון עזריאלי גבעתיים',
    kosherType: 'rabanut',
    address: 'דרך יצחק רבין 53, גבעתיים',
    lat: 32.0676, lon: 34.8126,
    phone: '0779386146',
    hours: "א' 09:30-22:00 | ב'-ה' 09:30-22:30 | שישי 09:30-14:30 | מוצ\"ש 20:30-22:30",
  },
  {
    id: 'manual-b-fresh-ayalon-ramat-gan',
    name: 'B-Fresh קניון איילון רמת גן',
    kosherType: 'rabanut',
    address: 'דרך אבא הלל 301, רמת גן',
    lat: 32.0847, lon: 34.8230,
    phone: '0779386134',
    hours: "א'-ה' 09:30-22:00 | שישי 09:30-14:30 | מוצ\"ש 20:30-22:00",
  },
  {
    id: 'manual-b-fresh-hagiva-givat-shmuel',
    name: 'B-Fresh קניון הגבעה גבעת שמואל',
    kosherType: 'mehadrin',
    address: 'יוני נתניהו 29, גבעת שמואל',
    lat: 32.0789, lon: 34.8487,
    phone: '0779386144',
    hours: "א'-ה' 09:30-21:30 | שישי 08:30-14:30 | שבת סגור",
  },
  // ===== פתח תקווה =====
  {
    id: 'manual-b-fresh-bsr-petah-tikva',
    name: 'B-Fresh ב.ס.ר פתח תקווה',
    kosherType: 'rabanut',
    address: 'תוצרת הארץ 3, פתח תקווה',
    lat: 32.0736, lon: 34.9031,
    phone: '0733861724',
    hours: "א'-ד' 09:30-22:00 | ה' 09:30-00:00 | שישי 09:00-16:00 | מוצ\"ש 20:30-00:00",
  },
  {
    id: 'manual-b-fresh-beilinson',
    name: 'B-Fresh בלינסון',
    kosherType: 'mehadrin',
    address: 'זאב ז\'בוטינסקי 39, פתח תקווה',
    lat: 32.0871, lon: 34.8853,
    phone: '0778801748',
    hours: "א'-ה' 09:00-21:30 | שישי 10:00-16:30 | שבת סגור",
  },
  // ===== חולון / בת ים =====
  {
    id: 'manual-b-fresh-azrieli-holon',
    name: 'B-Fresh קניון עזריאלי חולון',
    kosherType: 'rabanut',
    address: 'קניון עזריאלי, חולון',
    lat: 32.0044, lon: 34.7721,
    phone: '037356155',
    hours: "א'-ה' 09:30-21:30 | שישי 09:00-14:30 | מוצ\"ש 21:00-22:00",
  },
  {
    id: 'manual-b-fresh-bat-yam',
    name: 'B-Fresh קניון בת ים',
    kosherType: 'rabanut',
    address: 'קניון בת ים, בת ים',
    lat: 32.0237, lon: 34.7474,
    phone: '036588681',
    hours: "א'-ה' 10:00-21:30 | שישי 09:30-15:00 | שבת 17:30-22:30",
  },
  // ===== ראשון לציון =====
  {
    id: 'manual-b-fresh-hazahav-rishon',
    name: 'B-Fresh קניון הזהב ראשון לציון',
    kosherType: 'rabanut',
    address: 'קניון הזהב, ראשון לציון',
    lat: 31.9787, lon: 34.7893,
    phone: '0779386178',
    hours: "א'-ה' 09:15-22:00 | שישי 09:00-16:00 | מוצ\"ש 21:00-23:00",
  },
  {
    id: 'manual-b-fresh-azrieli-rishonim-rishon',
    name: 'B-Fresh עזריאלי ראשונים ראשון לציון',
    kosherType: 'rabanut',
    address: 'עזריאלי ראשונים, ראשון לציון',
    lat: 31.9754, lon: 34.7900,
    phone: '035087832',
    hours: "א'-ה' 09:30-22:00 | שישי 09:00-15:45 | מוצ\"ש 21:00-23:00",
  },
  // ===== באר יעקב =====
  {
    id: 'manual-b-fresh-beer-yaakov',
    name: 'B-Fresh באר יעקב',
    kosherType: 'mehadrin',
    address: 'באר יעקב',
    lat: 31.9432, lon: 34.8324,
    phone: '0779386156',
    hours: "א'-ה' 09:30-21:00 | שישי 09:30-14:30 | שבת סגור",
  },
  // ===== שוהם =====
  {
    id: 'manual-b-fresh-shoham-market',
    name: 'B-Fresh שוהם מרקט',
    kosherType: 'mehadrin',
    address: 'שוהם מרקט, שוהם',
    lat: 31.9967, lon: 34.9427,
    phone: '0773034060',
    hours: "א'-ד' 08:00-22:00 | ה' 08:00-23:00 | שישי 08:00-14:00",
  },
  // ===== ראש העין =====
  {
    id: 'manual-b-fresh-shapir-rosh-haayin',
    name: 'B-Fresh שפיר סנטר ראש העין',
    kosherType: 'rabanut',
    address: 'שפיר סנטר, ראש העין',
    lat: 32.0959, lon: 34.9573,
    phone: '035593154',
    hours: "א'-ה' 09:30-21:30 | שישי 09:30-14:00 | מוצ\"ש 18:30-21:30",
  },
  // ===== נס ציונה =====
  {
    id: 'manual-b-fresh-yashpro-nes-ziona',
    name: 'B-Fresh ישפרו סנטר נס ציונה',
    kosherType: 'mehadrin',
    address: 'ישפרו סנטר, נס ציונה',
    lat: 31.9292, lon: 34.8003,
    phone: '073-3277227',
    hours: "א'-ה' 09:00-22:00 | שישי 09:00-15:00 | מוצ\"ש 18:30-22:00",
  },
  // ===== רמלה =====
  {
    id: 'manual-b-fresh-azrieli-ramla',
    name: 'B-Fresh קניון עזריאלי רמלה',
    kosherType: 'mehadrin',
    address: 'קניון עזריאלי, רמלה',
    lat: 31.9276, lon: 34.8692,
    phone: '0779386150',
    hours: "א'-ה' 09:00-21:45 | שישי 09:00-15:00 | מוצ\"ש 21:00-23:00",
  },
  // ===== רחובות =====
  {
    id: 'manual-b-fresh-hanasi-rehovot',
    name: 'B-Fresh קניון הנשיא רחובות',
    kosherType: 'rabanut',
    address: 'קניון הנשיא, רחובות',
    lat: 31.8961, lon: 34.8111,
    phone: '0779386117',
    hours: "א'-ה' 09:00-21:00 | שישי 09:00-14:30 | שבת סגור",
  },
  {
    id: 'manual-b-fresh-ofer-rehovot',
    name: 'B-Fresh קניון עופר רחובות',
    kosherType: 'rabanut',
    address: 'קניון עופר, רחובות',
    lat: 31.8900, lon: 34.8150,
    phone: '0779386164',
    hours: "א'-ה' 09:00-22:00 | שישי 08:00-15:00 | מוצ\"ש 21:00-23:00",
  },
  // ===== נתניה =====
  {
    id: 'manual-b-fresh-ir-yamim-netanya',
    name: 'B-Fresh קניון עיר ימים נתניה',
    kosherType: 'rabanut',
    address: 'קניון עיר ימים, נתניה',
    lat: 32.3215, lon: 34.8532,
    phone: '0548622008',
    hours: "א'-ה' 08:30-22:00 | שישי 08:30-15:00 | מוצ\"ש 19:00-23:00",
  },
  // ===== מודיעין =====
  {
    id: 'manual-b-fresh-yashpro-modiin',
    name: 'B-Fresh ישפרו סנטר מודיעין',
    kosherType: 'rabanut',
    address: 'ישפרו סנטר, מודיעין',
    lat: 31.8969, lon: 35.0099,
    phone: '0779386173',
    hours: "א'-ה' 09:30-22:00 | שישי 09:30-15:00 | מוצ\"ש 20:00-23:00",
  },
  {
    id: 'manual-b-fresh-azrieli-modiin',
    name: 'B-Fresh קניון עזריאלי מודיעין',
    kosherType: 'rabanut',
    address: 'קניון עזריאלי, מודיעין',
    lat: 31.9157, lon: 35.0261,
    phone: null,
    hours: "א'-ה' 09:30-22:00 | שישי 09:30-15:30 | מוצ\"ש 20:30-23:00",
  },
  // ===== כפר יונה =====
  {
    id: 'manual-b-fresh-kfar-yona',
    name: 'B-Fresh כפר יונה',
    kosherType: 'rabanut',
    address: 'כפר יונה',
    lat: 32.3175, lon: 34.9364,
    phone: '097680127',
    hours: "א'-ה' 09:30-21:00 | שישי 09:00-15:00 | שבת סגור",
  },
  // ===== גדרה =====
  {
    id: 'manual-b-fresh-big-gedera',
    name: 'B-Fresh ביג גדרה',
    kosherType: 'mehadrin',
    address: 'ביג גדרה, גדרה',
    lat: 31.8132, lon: 34.7765,
    phone: '0773034085',
    hours: "א'-ה' 09:30-21:00 | שישי 09:00-14:00 | שבת סגור",
  },
  // ===== אשדוד =====
  {
    id: 'manual-b-fresh-star-center-ashdod',
    name: 'B-Fresh סטאר סנטר אשדוד',
    kosherType: 'mehadrin',
    address: 'סטאר סנטר, אשדוד',
    lat: 31.7956, lon: 34.6500,
    phone: '0733861744',
    hours: "א'-ה' 09:00-23:00 | שישי 09:00-15:00 | מוצ\"ש 21:00-23:30",
  },
  {
    id: 'manual-b-fresh-gan-hair-ashdod',
    name: 'B-Fresh גן העיר אשדוד',
    kosherType: 'mehadrin',
    address: 'גן העיר, אשדוד',
    lat: 31.8010, lon: 34.6430,
    phone: '0733861725',
    hours: "א'-ה' 10:00-22:30 | שישי 09:30-15:00 | מוצ\"ש 21:00-23:30",
  },
  // ===== אריאל =====
  {
    id: 'manual-b-fresh-ariel',
    name: 'B-Fresh אריאל',
    kosherType: 'mehadrin',
    address: 'אריאל',
    lat: 32.1044, lon: 35.1675,
    phone: '037399334',
    hours: "א'-ה' 09:00-22:00 | שישי 09:00-14:30 | שבת סגור",
  },
  // ===== ביג קסטינה =====
  {
    id: 'manual-b-fresh-big-kastina',
    name: 'B-Fresh ביג קסטינה',
    kosherType: 'mehadrin',
    address: 'ביג קסטינה',
    lat: 31.6917, lon: 34.6903,
    phone: '0773034018',
    hours: "א'-ה' 10:00-21:00 | שישי 09:30-14:30 | שבת סגור",
  },
  // ===== בית שמש =====
  {
    id: 'manual-b-fresh-shaar-hair-beit-shemesh',
    name: 'B-Fresh שער העיר בית שמש',
    kosherType: 'mehadrin',
    address: 'שער העיר, בית שמש',
    lat: 31.7468, lon: 34.9888,
    phone: '0733861720',
    hours: "א'-ד' 09:00-23:00 | ה' 09:00-23:30 | שישי 09:00-15:00 | מוצ\"ש 21:00-23:30",
  },
  // ===== חדרה =====
  {
    id: 'manual-b-fresh-mul-hahof-hadera',
    name: 'B-Fresh מול החוף חדרה',
    kosherType: 'rabanut',
    address: 'מול החוף, חדרה',
    lat: 32.4343, lon: 34.9199,
    phone: '0779386135',
    hours: "א' 09:30-22:00 | ב'-ד' 10:00-22:00 | ה' 10:00-22:30 | שישי 09:30-15:00 | מוצ\"ש 21:30-23:00",
  },
  // ===== מבשרת ציון =====
  {
    id: 'manual-b-fresh-harel-mevasseret',
    name: 'B-Fresh קניון הראל מבשרת ציון',
    kosherType: 'mehadrin',
    address: 'קניון הראל, מבשרת ציון',
    lat: 31.8054, lon: 35.1447,
    phone: '0773034017',
    hours: "א'-ה' 10:00-22:00 | שישי 09:30-15:00 | מוצ\"ש 21:00-23:00",
  },
  {
    id: 'manual-b-fresh-kanyon-mevasseret',
    name: 'B-Fresh קניון מבשרת',
    kosherType: 'mehadrin',
    address: 'קניון מבשרת, מבשרת ציון',
    lat: 31.8060, lon: 35.1520,
    phone: '0733861755',
    hours: "א'-ה' 09:30-21:30 | שישי 09:30-15:00 | מוצ\"ש 21:00-23:00",
  },
  // ===== חריש =====
  {
    id: 'manual-b-fresh-harish',
    name: 'B-Fresh חריש',
    kosherType: 'mehadrin',
    address: 'חריש',
    lat: 32.4575, lon: 35.0436,
    phone: null,
    hours: "א'-ה' 10:00-22:00 | שישי 10:30-14:00 | מוצ\"ש 21:00-23:30",
  },
  // ===== אשקלון =====
  {
    id: 'manual-b-fresh-marina-ashkelon',
    name: 'B-Fresh מרינה מול אשקלון',
    kosherType: 'rabanut',
    address: 'מרינה מול, אשקלון',
    lat: 31.6688, lon: 34.5742,
    phone: '089960592',
    hours: "א'-ה' 10:00-23:00 | שישי 10:00-17:00 | מוצ\"ש 21:00-23:00",
  },
  {
    id: 'manual-b-fresh-giron-ashkelon',
    name: 'B-Fresh קניון גירון אשקלון',
    kosherType: 'rabanut',
    address: 'קניון גירון, אשקלון',
    lat: 31.6650, lon: 34.5680,
    phone: '0779386182',
    hours: "א'-ה' 09:00-21:30 | שישי 09:00-14:30 | מוצ\"ש 21:00-22:45",
  },
  // ===== כרמי גת =====
  {
    id: 'manual-b-fresh-big-karmi-gat',
    name: 'B-Fresh BIG כרמי גת',
    kosherType: 'rabanut',
    address: 'BIG כרמי גת, קרית גת',
    lat: 31.6128, lon: 34.7631,
    phone: '0773034088',
    hours: "א'-ה' 10:00-22:30 | שישי 09:30-15:00 | מוצ\"ש 21:00-23:00",
  },
  // ===== ירושלים =====
  {
    id: 'manual-b-fresh-shaarei-tzedek-jerusalem',
    name: 'B-Fresh שערי צדק ירושלים',
    kosherType: 'mehadrin',
    address: 'בית חולים שערי צדק, ירושלים',
    lat: 31.7838, lon: 35.1851,
    phone: '0779386143',
    hours: "א'-ה' 08:00-21:00 | שישי 08:00-15:00 | שבת סגור",
  },
  {
    id: 'manual-b-fresh-ben-yehuda-jerusalem',
    name: 'B-Fresh בן יהודה ירושלים',
    kosherType: 'mehadrin',
    address: 'בן יהודה, ירושלים',
    lat: 31.7785, lon: 35.2193,
    phone: '0779386183',
    hours: "א'-ה' 10:00-23:00 | שישי 10:00-14:00 | מוצ\"ש 20:00-23:00",
  },
  {
    id: 'manual-b-fresh-malha-jerusalem',
    name: 'B-Fresh קניון מלחה ירושלים',
    kosherType: 'mehadrin',
    address: 'קניון מלחה, ירושלים',
    lat: 31.7524, lon: 35.1925,
    phone: '0779386102',
    hours: "א'-ה' 08:00-22:45 | שישי 07:45-15:45 | מוצ\"ש 20:15-23:45",
  },
  {
    id: 'manual-b-fresh-mamilla-jerusalem',
    name: 'B-Fresh ממילא ירושלים',
    kosherType: 'mehadrin',
    address: 'ממילא, ירושלים',
    lat: 31.7785, lon: 35.2193,
    phone: '025714715',
    hours: "א'-ה' 09:30-22:30 | שישי 09:30-14:30 | מוצ\"ש 20:30-23:00",
  },
  {
    id: 'manual-b-fresh-hadar-jerusalem',
    name: 'B-Fresh קניון הדר ירושלים',
    kosherType: 'mehadrin',
    address: 'קניון הדר, ירושלים',
    lat: 31.7683, lon: 35.2137,
    phone: '0779386169',
    hours: "א'-ה' 09:00-21:30 | שישי 09:00-14:30 | מוצ\"ש 21:00-23:00",
  },
  // ===== מגדל העמק =====
  {
    id: 'manual-b-fresh-kfar-horeshe-migdal-haemek',
    name: 'B-Fresh כפר חורש מגדל העמק',
    kosherType: 'mehadrin',
    address: 'כפר חורש, מגדל העמק',
    lat: 32.6757, lon: 35.2364,
    phone: '0779984707',
    hours: "א'-ה' 10:00-22:00 | שישי 09:00-14:00 | מוצ\"ש 19:00-23:00",
  },
  // ===== נשר =====
  {
    id: 'manual-b-fresh-tel-hanan-nesher',
    name: 'B-Fresh תל חנן נשר',
    kosherType: 'rabanut',
    address: 'תל חנן, נשר',
    lat: 32.7717, lon: 35.0398,
    phone: '046384787',
    hours: "א'-ה' 09:00-23:00 | שישי 09:00-16:00 | מוצ\"ש 21:00-23:00",
  },
  // ===== קרית אתא =====
  {
    id: 'manual-b-fresh-shaar-hazafon-kiryat-ata',
    name: 'B-Fresh שער הצפון קרית אתא',
    kosherType: 'rabanut',
    address: 'שער הצפון, קרית אתא',
    lat: 32.8047, lon: 35.1069,
    phone: '0546107750',
    hours: "א'-ה' 09:30-21:30 | שישי 08:30-14:30 | מוצ\"ש 21:00-23:00",
  },
  // ===== קרית ביאליק =====
  {
    id: 'manual-b-fresh-hakiryon-kiryat-bialik',
    name: 'B-Fresh הקריון קרית ביאליק',
    kosherType: 'rabanut',
    address: 'הקריון, קרית ביאליק',
    lat: 32.8384, lon: 35.0881,
    phone: '0546107750',
    hours: "א'-ה' 10:00-22:00 | שישי 09:00-15:00 | מוצ\"ש 19:00-23:00",
  },
  // ===== באר שבע =====
  {
    id: 'manual-b-fresh-grand-kanyon-beersheva',
    name: 'B-Fresh גראנד קניון באר שבע',
    kosherType: 'rabanut',
    address: 'גראנד קניון, באר שבע',
    lat: 31.2520, lon: 34.7973,
    phone: '0779386107',
    hours: "א' 09:30-22:00 | ב' 09:00-22:00 | ג'-ה' 09:30-22:00 | שישי 09:00-15:30 | מוצ\"ש 21:00-23:00",
  },
  // ===== קרית שמונה =====
  {
    id: 'manual-b-fresh-nahamia-kiryat-shmona',
    name: 'B-Fresh קניון נחמיה קרית שמונה',
    kosherType: 'mehadrin',
    address: 'קניון נחמיה, קרית שמונה',
    lat: 33.2088, lon: 35.5711,
    phone: '0733277246',
    hours: "א'-ה' 08:30-21:30 | שישי 08:30-15:00 | שבת סגור",
  },
  // ===== עין יהב =====
  {
    id: 'manual-b-fresh-ein-yahav',
    name: 'B-Fresh פונדק עין יהב',
    kosherType: 'rabanut',
    address: 'פונדק עין יהב, עין יהב',
    lat: 30.6153, lon: 35.1814,
    phone: '0779800439',
    hours: "א'-ה' 09:00-19:00 | שישי 09:00-14:00 | שבת סגור",
  },
  // ===== אילת =====
  {
    id: 'manual-b-fresh-ice-mall-eilat',
    name: 'B-Fresh אייס מול אילת',
    kosherType: 'rabanut',
    address: 'אייס מול, אילת',
    lat: 29.5577, lon: 34.9519,
    phone: '0779386109',
    hours: "א'-ה' 10:00-23:00 | שישי 10:00-15:00 | מוצ\"ש 19:00-23:00",
  },
  {
    id: 'manual-b-fresh-mul-hayam-eilat',
    name: 'B-Fresh מול הים אילת',
    kosherType: 'rabanut',
    address: 'מול הים, אילת',
    lat: 29.5577, lon: 34.9519,
    phone: '0779386112',
    hours: "א'-ה' 09:30-23:00 | שישי 09:30-14:30 | מוצ\"ש 21:00-23:00",
  },
];

// Deduplicate: skip any branch whose id already exists
const existingIds = new Set(data.map(p => p.id));
const toAdd = branches.filter(b => !existingIds.has(b.id));

for (const b of toAdd) {
  const entry = {
    id: b.id,
    name: b.name,
    type: 'juice_bar',
    kosherType: b.kosherType,
    address: b.address,
    location: { latitude: b.lat, longitude: b.lon },
    locationPrecision: 'city',
    openingHours: b.hours,
    website: WEBSITE,
  };
  if (b.phone) entry.phone = b.phone;
  data.push(entry);
}

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
console.log(`Added ${toAdd.length} B-Fresh branches. Skipped ${branches.length - toAdd.length} already existing.`);
toAdd.forEach(b => console.log(`  ✅ ${b.name}`));

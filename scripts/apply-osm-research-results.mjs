import fs from 'fs';

const DATA_PATH = 'src/data/generated/places.osm.json';
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

const UPDATES = [
  { id: "osm-node-889810577", kosherType: "rabanut_mekomi", certifiedBy: "רבנות הרצליה", instagram: "https://www.instagram.com/papagaio__herzeliya/" },
  { id: "osm-node-1643352285", kosherType: "rabanut_mekomi", certifiedBy: "המועצה הדתית נתניה", website: "https://marrakesh.co.il" },
  { id: "osm-node-1753285811", kosherType: "rabanut_mekomi", certifiedBy: "רבנות הרצליה", website: "https://bistro56.co.il" },
  { id: "osm-node-2131481387", kosherType: "rabanut_tel_aviv", certifiedBy: "המועצה הדתית תל אביב יפו" },
  { id: "osm-node-2701869276", kosherType: "rabanut_mekomi", certifiedBy: "רבנות הרצליה" },
  { id: "300-gram-batzat", kosherType: "rabanut_mekomi", website: "https://300gramchef.co.il" },
  { id: "badra-rehovot", kosherType: "rabanut_mekomi", certifiedBy: "מועצה דתית רחובות" },
  { id: "mitbalim-rosh-pina", kosherType: "mehadrin", certifiedBy: "מועצה דתית ראש פינה", website: "https://mitbalim.rol.co.il" },
  { id: "tadmit-catering-ks", kosherType: "rabanut_mekomi", website: "https://www.k-tadmit.co.il" },
  { id: "osm-node-5170599211", kosherType: "rabanut_mekomi", certifiedBy: "רבנות רמת השרון", website: "https://www.yashka.co.il" },
  { id: "osm-node-5176327119", kosherType: "mehadrin", certifiedBy: "מועצה דתית קריית שמונה", website: "https://hashnizelia.co.il", instagram: "https://www.instagram.com/hashnizelia_kiryat_shmona/" },
  { id: "osm-node-5299442042", kosherType: "mehadrin", website: "https://pizza-baribua.com" },
  { id: "osm-node-5299594181", kosherType: "mehadrin", website: "http://www.esterica-pizza.co.il", instagram: "https://www.instagram.com/esterica_km/" },
  { id: "osm-node-5711545461", kosherType: "rabanut_mekomi", certifiedBy: "רבנות ראש פינה", instagram: "https://www.instagram.com/shipudei_simha_roshpina/" },
  { id: "osm-node-5746423221", kosherType: "rabanut_mekomi", certifiedBy: "המועצה הדתית באר שבע" },
  { id: "osm-node-5894335311", kosherType: "rabanut_mekomi", certifiedBy: "רבנות רחובות", website: "https://casa-del-pepe.co.il" },
  { id: "osm-node-5997818140", kosherType: "badatz_rubin", certifiedBy: 'בד"צ מהדרין - הרב רובין' },
  { id: "osm-node-6014904184", kosherType: "rabanut_mekomi", certifiedBy: "מועצה דתית ראש פינה", website: "https://hashnizelia.co.il" },
  { id: "osm-node-6023053936", kosherType: "rabanut_mekomi", website: "https://karnaf.com/ramat-hasharon/" },
  { id: "osm-node-6195852402", kosherType: "mehadrin", certifiedBy: "הרב רפאל מנת", website: "https://angelicarest.com", category: "meat" },
  { id: "oshi-rehovot", kosherType: "badatz_beit_yosef", certifiedBy: 'בד"ץ בית יוסף', website: "https://oshioshi.co.il" },
  { id: "pasta-basta-rehovot", kosherType: "rabanut_mekomi", website: "https://pastabasta.co.il" },
  { id: "haburganim-ramat-rachel", kosherType: "rabanut_mekomi", certifiedBy: "רבנות ירושלים", website: "https://haburganim.com" },
  { id: "110-burger-beit-shemesh", kosherType: "rabanut_mekomi", website: "https://110burger.com" },
  { id: "tortilla-makor-habasar-herzliya", kosherType: "rabanut_mekomi", certifiedBy: "המועצה הדתית הרצליה" },
  { id: "kuskus-galia-tel-mond", kosherType: "rabanut_mekomi", website: "https://kuskus-galia.co.il" },
  { id: "spicy-grill-bar-ramat-gan", kosherType: "rav_machpud", certifiedBy: "רב מחפוד", website: "https://spicybar.co.il" },
  { id: "granada-italia-rehovot", kosherType: "mehadrin", certifiedBy: "מועצה דתית רחובות" },
  { id: "osm-node-9933397079", kosherType: "rabanut_mekomi", certifiedBy: "רבנות מבשרת ציון", website: "https://atza.co.il/mevaseret-zion/" },
  { id: "osm-node-9933397084", kosherType: "rabanut_mekomi", certifiedBy: "המועצה הדתית מבשרת ציון", website: "https://www.gracia-rest.co.il/" },
  { id: "osm-node-10548308215", kosherType: "rabanut_mekomi", certifiedBy: "מועצה דתית רחובות", website: "https://hummuskazablan.co.il/" },
  { id: "osm-node-11009821837", kosherType: "rabanut_mekomi", certifiedBy: "המועצה הדתית באר שבע", website: "https://schnitzelstory.orderss.co.il/" },
  { id: "osm-node-11226656316", kosherType: "mehadrin", certifiedBy: "רבנות רמת גן", website: "https://shawarmastreet.co.il/" },
  { id: "osm-node-11987921470", kosherType: "badatz_rubin", certifiedBy: "הרב רובין", website: "https://katsefet.co.il" },
  { id: "osm-node-12578972524", kosherType: "mehadrin", website: "https://www.breadcafe.co.il", instagram: "https://www.instagram.com/breadcafe_il/" },
  { id: "osm-node-12809538406", kosherType: "rabanut_mekomi", instagram: "https://www.instagram.com/kirshcafe/" },
  { id: "osm-node-13372953517", kosherType: "rabanut_mekomi", certifiedBy: "רבנות כרמיאל" },
  { id: "osm-node-13377863599", kosherType: "rabanut_mekomi", certifiedBy: "מועצה דתית רחובות" },
  { id: "osm-node-13426948731", kosherType: "mehadrin", website: "https://ada.shopix.me" },
  { id: "osm-node-13431169858", kosherType: "badatz_edah", certifiedBy: 'רבנות ירושלים ובד"צ העדה החרדית' },
  { id: "osm-node-13664318565", kosherType: "rabanut_mekomi", certifiedBy: "רבנות ירושלים" },
  { id: "osm-node-13722760900", kosherType: "rabanut_mekomi", certifiedBy: "רבנות פתח תקווה", website: "https://pitmaster.show" },
  { id: "osm-node-13783714633", kosherType: "badatz_edah", certifiedBy: "בד\"צ העדה החרדית", website: "https://karvedeli.com" },
  { id: "osm-node-13799211350", kosherType: "mehadrin", certifiedBy: 'רבנות ירושלים / בד"צ קהילות', instagram: "https://www.instagram.com/shabbos.bistro/" },
  { id: "osm-node-13828231472", kosherType: "rabanut_mekomi", certifiedBy: "רבנות נשר", website: "https://kivsashora.com" },
  { id: "osm-node-13864585863", kosherType: "badatz_beit_yosef", certifiedBy: 'בד"צ בית יוסף' },
  { id: "osm-node-13903561256", kosherType: "rabanut_mekomi", certifiedBy: "מועצה דתית נתניה", instagram: "https://www.instagram.com/smash_it_netanya/" },
  { id: "osm-way-1049269959", kosherType: "rabanut_mekomi", certifiedBy: "רבנות הרצליה", website: "https://www.river-bar.co.il" },
];

const DELETE_IDS = new Set([
  "osm-node-1675753858","osm-node-1741956261","osm-node-1820017020","osm-node-1938812801",
  "osm-node-2078991165","osm-node-2078991174","osm-node-2144612020","osm-node-2318762536",
  "osm-node-2366076834","osm-node-2701869274","cake-art-tel-aviv","black-petah-tikva",
  "shawarma-aharon-ks","shawarma-zion-ks","pizza-matrizza-ks","sandwichah-ks",
  "bataam-hasini-ks","falafel-binyamin-ks","burger-bomba-ks","shipudei-hatikva-ks",
  "italia-haketana-ks","osm-node-5181482358","osm-node-5230853731","osm-node-5298217097",
  "osm-node-5299442041","osm-node-5302021702","osm-node-5302040666","osm-node-5302063381",
  "osm-node-5498980275","osm-node-5613756285","osm-node-5853761588","osm-node-5890281794",
  "osm-node-5890281795","osm-node-5917569185","osm-node-5995053444","osm-node-6014902517",
  "osm-node-6014908134","osm-node-6015034147","osm-node-6023052884","osm-node-6195004555",
  "kafeh-tzfoni-kiryat-shmona","mexicanas-rosh-pina","pizza-agvania-ramat-rachel",
  "shakti-beer-sheva","hasheva-shawarma-ashdod","costa-del-rum-galil-yam",
  "davids-burger-netanya","osm-node-9874070518","osm-node-10020598395","osm-node-10299385509",
  "osm-node-10682695046","osm-node-10955696002","osm-node-10978563605","osm-node-11015408972",
  "osm-node-11163232373","osm-node-11199665737","osm-node-11226651758","osm-node-11226657264",
  "osm-node-11330876273","osm-node-11330876274","osm-node-11397608290","osm-node-11414872844",
  "osm-node-11414907376","osm-node-11518709323","osm-node-11522749847","osm-node-11542534410",
  "osm-node-11793136463","osm-node-11818013490","osm-node-11922661782","osm-node-11980703710",
  "osm-node-11980731518","osm-node-12208598222","osm-node-12232451233","osm-node-12301608266",
  "osm-node-12301648358","osm-node-12462916500","osm-node-12520425651","osm-node-12529700323",
  "osm-node-12578960888","osm-node-12578978007","osm-node-12593444378","osm-node-12596111450",
  "osm-node-13057613009","osm-node-13145926871","osm-node-13155351118","osm-node-13155351119",
  "osm-node-13283836813","osm-node-13283836814","osm-node-13286258733","osm-node-13377884604",
  "osm-node-13466794202","osm-node-13508662103","osm-node-13619434567","osm-node-13903561258",
  "osm-node-13926659016","osm-way-37771222","osm-way-873449738","osm-way-1447248358",
  "osm-node-7049580105",
]);

const UPDATABLE = ['kosherType','certifiedBy','category','website','instagram'];

let updatedCount = 0;
let deletedCount = 0;

const result = data
  .filter(p => {
    if (DELETE_IDS.has(p.id)) { deletedCount++; return false; }
    return true;
  })
  .map(p => {
    const upd = UPDATES.find(u => u.id === p.id);
    if (!upd) return p;
    const next = { ...p };
    for (const field of UPDATABLE) {
      if (upd[field] && !p[field]) next[field] = upd[field];
    }
    // kosherType always overwrite (was missing before)
    if (upd.kosherType) next.kosherType = upd.kosherType;
    updatedCount++;
    return next;
  });

fs.writeFileSync(DATA_PATH, JSON.stringify(result, null, 2), 'utf8');
console.log(`✅ Deleted: ${deletedCount}`);
console.log(`✅ Updated: ${updatedCount}`);
console.log(`Total remaining: ${result.length}`);

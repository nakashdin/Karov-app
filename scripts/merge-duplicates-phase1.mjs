import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dir = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dir, '..')
const DATA_PATH = path.join(ROOT, 'src/data/generated/places.osm.json')
const raw = readFileSync(DATA_PATH, 'utf-8').replace(/^﻿/, '')
let places = JSON.parse(raw)
const before = places.length

// ─── IDs to delete outright ───────────────────────────────────────────────
const DELETE_IDS = new Set([
  // גולדה — raw duplicates with wrong cityId / missing certifiedBy
  'golda-6acf01da',
  'golda-58a85dcc',
  // פיצה סטורי — raw 9000xxx records (manual records are richer)
  '9000103', '9000104', '9000105', '9000107',
  // פיצה סטורי — city-level address only, useless
  'manual-pizza-story-tlv',
  // קנסאי — OSM duplicate of manual-kansai-tlv
  'osm-node-12588113205',
  // קנסאי — raw duplicate of manual-kansai-pt
  'kansai-4c330d09',
  // סושי בזל — manual duplicate of sushi-bazel-b075a6c4
  'manual-sushi-bazel-tlv',
  // חומוס אליהו — name typo + encoding bug duplicate
  'humus-eli-חומוס-אליהו-צמח-טבריה',
  // ממפיס — wrong address (הירקון 10 בני ברק), both are wrong
  'manual-fast-food-memphis-bnei-brak',
  'memphis-fd5759c0',
  // דבוש — OSM duplicates
  'osm-node-777400976',
  'osm-node-8142764996',
  'osm-node-10723520074',
  // דבוש — manual duplicates (merge social links into dabush-* records)
  'manual-dabush-tlv-ibn-gavirol',
  'manual-dabush-tlv-karlbach',
])

// ─── Update map ───────────────────────────────────────────────────────────
// Each entry: id → object with fields to SET (merged over existing record)
const UPDATES = {

  // ══════════════════════════════════════════
  // גלידה גולדה לוד
  // ══════════════════════════════════════════
  'manual-golda-lod': {
    name: 'גלידה גולדה',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
    openingHours: "א'-ה' 10:00-22:00 | ו' 10:00-שעתיים לפני כניסת שבת | ש' שעה אחרי צאת שבת עד 22:30",
    description: "שעות הפעילות בסופ\"ש משתנות בהתאם להנחיות של המועצה הדתית המקומית",
    website: 'https://www.goldaglida.co.il',
    instagram: 'https://www.instagram.com/golda.glida',
    facebook: 'https://www.facebook.com/GLIDAGOLDAISRAEL',
    menu: 'https://www.goldaglida.co.il/flavors/',
    cityId: 'לוד',
    lastVerifiedAt: '2026-07-29',
    source: 'manual',
  },

  // ══════════════════════════════════════════
  // גלידה גולדה אור יהודה
  // ══════════════════════════════════════════
  'manual-golda-or-yehuda': {
    name: 'גלידה גולדה',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
    openingHours: "א'-ה' 10:00-23:00 | ו' 10:00-15:00 | ש' שעה אחרי צאת שבת עד 23:00",
    description: "שעות הפעילות בסופ\"ש משתנות בהתאם להנחיות של המועצה הדתית המקומית",
    website: 'https://www.goldaglida.co.il',
    instagram: 'https://www.instagram.com/golda.glida',
    facebook: 'https://www.facebook.com/GLIDAGOLDAISRAEL',
    menu: 'https://www.goldaglida.co.il/flavors/',
    cityId: 'אור יהודה',
    lastVerifiedAt: '2026-07-29',
    source: 'manual',
  },

  // ══════════════════════════════════════════
  // פיצה סטורי — כל הסניפים
  // ══════════════════════════════════════════
  'manual-pizza-story-pt': {
    name: 'פיצה סטורי',
    phone: '03-5566516',
    // GPS from 9000104 which had locationPrecision=address (more accurate)
    location: { latitude: 32.084, longitude: 34.8878 },
    locationPrecision: 'address',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
    website: 'https://pizza-story.co.il',
    instagram: 'https://www.instagram.com/pizza_story_il',
    menu: 'https://pizza-story.co.il/?page_id=200',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-pizza-story-jrm-talpiot': {
    name: 'פיצה סטורי',
    phone: '02-5000086',
    // GPS from 9000103 (locationPrecision=address)
    location: { latitude: 31.7683, longitude: 35.2137 },
    locationPrecision: 'address',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
    website: 'https://pizza-story.co.il',
    instagram: 'https://www.instagram.com/pizza_story_il',
    menu: 'https://pizza-story.co.il/?page_id=200',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-pizza-story-tzafria': {
    name: 'פיצה סטורי',
    phone: '03-6914999',
    // GPS from 9000107 (locationPrecision=address, more accurate)
    location: { latitude: 31.947, longitude: 34.848 },
    locationPrecision: 'address',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
    website: 'https://pizza-story.co.il',
    instagram: 'https://www.instagram.com/pizza_story_il',
    menu: 'https://pizza-story.co.il/?page_id=200',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-pizza-story-beersheva': {
    name: 'פיצה סטורי',
    phone: '08-6222110',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
    website: 'https://pizza-story.co.il',
    instagram: 'https://www.instagram.com/pizza_story_il',
    facebook: 'https://www.facebook.com/pizzastoryil',
    menu: 'https://pizza-story.co.il/?page_id=200',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-pizza-story-modiin': {
    name: 'פיצה סטורי',
    kosherType: 'badatz_beit_yosef',
    website: 'https://pizza-story.co.il',
    instagram: 'https://www.instagram.com/pizza_story_il',
    menu: 'https://pizza-story.co.il/?page_id=200',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-pizza-story-rosh-haayin': {
    name: 'פיצה סטורי',
    phone: null,
    kosherType: 'mehadrin',
    certifiedBy: 'רבנות ראש העין מהדרין',
    website: 'https://pizza-story.co.il',
    instagram: 'https://www.instagram.com/pizza_story_il',
    menu: 'https://pizza-story.co.il/?page_id=200',
    lastVerifiedAt: '2026-07-29',
  },

  // ══════════════════════════════════════════
  // קנסאי סושי
  // ══════════════════════════════════════════
  'manual-kansai-pt': {
    name: 'קנסאי סושי',
    phone: '03-6027707',
    openingHours: "א'-ה' 10:30-22:45 | ו' 10:30-14:30 | ש' שעה אחרי צאת שבת עד 23:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות פתח תקווה',
    website: 'https://kansai.co.il',
    instagram: 'https://www.instagram.com/kansai_sushi',
    facebook: 'https://www.facebook.com/sushikansai',
    menu: 'https://kansai.co.il/menu/',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-kansai-tlv': {
    name: 'קנסאי סושי',
    phone: '03-6027707',
    openingHours: "א'-ה' 11:00-23:00 | ו' סגור | ש' שעה אחרי צאת שבת עד 23:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות תל אביב',
    website: 'https://kansai.co.il',
    instagram: 'https://www.instagram.com/kansai_sushi',
    facebook: 'https://www.facebook.com/sushikansai',
    menu: 'https://kansai.co.il/menu/',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-kansai-holon': {
    name: 'קנסאי סושי',
    phone: '*6964',
    openingHours: "א'-ה' 11:00-23:00 | ש' שעה אחרי צאת שבת עד 23:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות חולון',
    website: 'https://kansai.co.il',
    instagram: 'https://www.instagram.com/kansai_sushi',
    facebook: 'https://www.facebook.com/sushikansai',
    menu: 'https://kansai.co.il/menu/',
    lastVerifiedAt: '2026-07-29',
  },

  // ══════════════════════════════════════════
  // סושי בזל
  // ══════════════════════════════════════════
  'sushi-bazel-b075a6c4': {
    name: 'סושי בר בזל',
    phone: '077-9968444',
    address: 'בוגרשוב 33, תל אביב',
    cityId: 'תל אביב',
    instagram: 'https://www.instagram.com/sushi_bazel_',
    facebook: 'https://www.facebook.com/sushibarbazeltlv',
    certifiedBy: 'רבנות תל אביב',
    kosherType: 'rabanut',
    website: 'https://sushibarbazel.co.il',
    menu: 'https://sushibarbazel.co.il/menu/',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-sushi-bazel-netanya': {
    name: 'סושי בר בזל',
    address: 'מפי 5, מתחם סוהו, נתניה',
    phone: '09-7676111',
    kosherType: 'rabanut',
    certifiedBy: 'רבנות נתניה',
    website: 'https://sushibarbazel.co.il',
    instagram: 'https://www.instagram.com/sushi_bazel_',
    facebook: 'https://www.facebook.com/sushibarbazeltlv',
    menu: 'https://sushibarbazel.co.il/natanya/menu-natanya-he/',
    lastVerifiedAt: '2026-07-29',
  },

  // ══════════════════════════════════════════
  // חומוס אליהו צמח — תיקון GPS + עדכון
  // ══════════════════════════════════════════
  'humus-eli-חומוס-אליהו-צמח': {
    name: 'חומוס אליהו צמח',
    cityId: 'צמח',
    address: 'צומת צמח',
    phone: '04-8555100',
    openingHours: "א'-ה' 10:00-18:00 | ו' 10:00-14:30",
    kosherType: 'mehadrin',
    // FIXED GPS — was pointing to Rishon area (31.97/34.79) instead of southern Kinneret
    location: { latitude: 32.7048, longitude: 35.5997 },
    locationPrecision: 'address',
    lastVerifiedAt: '2026-07-29',
  },

  // ══════════════════════════════════════════
  // ממפיס פתח תקווה
  // ══════════════════════════════════════════
  'manual-memphis-pt': {
    name: 'ממפיס',
    type: 'restaurant',
    description: 'המבורגר פרימיום כשר',
    website: 'https://www.memphis.co.il',
    menu: 'https://www.memphis.co.il/תפריטים/',
    instagram: 'https://www.instagram.com/memphis_burger',
    facebook: 'https://www.facebook.com/memphiskosherburger',
    certifiedBy: 'בד"ץ בית יוסף',
    kosherType: 'mehadrin',
    openingHours: "א'-ד' 12:00-23:00 | ה' 12:00-01:00",
    lastVerifiedAt: '2026-07-29',
  },

  // ══════════════════════════════════════════
  // דבוש שווארמה — כל הסניפים
  // ══════════════════════════════════════════
  'dabush-17b852d3': {
    name: 'דבוש שווארמה',
    phone: '03-6912175',
    openingHours: "א'-ה' 11:00-04:00 | ו' סגור | ש' שעה אחרי צאת שבת עד 04:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות תל אביב',
    instagram: 'https://www.instagram.com/dabush_shawarma',
    facebook: 'https://www.facebook.com/DabushShawarma',
    lastVerifiedAt: '2026-07-29',
  },
  'dabush-cb70dd22': {
    name: 'דבוש שווארמה',
    // phone 052-7961919 belonged to Rishon branch — remove for Karlibach
    phone: null,
    openingHours: "א'-ה' 11:00-22:00 | ו' סגור | ש' שעה אחרי צאת שבת עד 22:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות תל אביב',
    instagram: 'https://www.instagram.com/dabush_shawarma',
    facebook: 'https://www.facebook.com/DabushShawarma',
    lastVerifiedAt: '2026-07-29',
  },
  'dabush-7091d952': {
    name: 'דבוש שווארמה',
    phone: '052-7961919',
    openingHours: "א'-ה' 11:00-22:00 | ו' סגור | ש' שעה אחרי צאת שבת עד 22:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות פתח תקווה',
    lastVerifiedAt: '2026-07-29',
  },
  'dabush-e696730e': {
    name: 'דבוש שווארמה',
    phone: '03-6912175',
    openingHours: "א'-ה' 11:00-00:00 | ו' סגור | ש' שעה אחרי צאת שבת עד 00:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות נתניה',
    lastVerifiedAt: '2026-07-29',
  },
  'dabush-b75376ce': {
    name: 'דבוש שווארמה',
    phone: '052-7961919',
    openingHours: "א'-ה' 11:00-00:00 | ו' סגור | ש' שעה אחרי צאת שבת עד 22:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות חולון',
    lastVerifiedAt: '2026-07-29',
  },
  'dabush-9a61b90a': {
    name: 'דבוש שווארמה',
    phone: '03-6912175',
    openingHours: "א'-ה' 11:00-18:00 | ו' סגור | ש' סגור",
    kosherType: 'mehadrin',
    certifiedBy: 'רבנות בני ברק מהדרין',
    lastVerifiedAt: '2026-07-29',
  },
  'manual-dabush-rishon': {
    name: 'דבוש שווארמה',
    type: 'restaurant',
    phone: '052-7961919',
    openingHours: "א'-ד' 11:00-03:00 | ה' 11:00-04:00 | ו' סגור | ש' שעה אחרי צאת שבת עד 03:00",
    kosherType: 'rabanut',
    certifiedBy: 'רבנות ראשון לציון',
    instagram: 'https://www.instagram.com/dabush_shawarma',
    facebook: 'https://www.facebook.com/DabushShawarma',
    lastVerifiedAt: '2026-07-29',
  },
}

// ─── New records to add ───────────────────────────────────────────────────
const NEW_RECORDS = [
  // פיצה סטורי אזור (new branch from website)
  {
    id: 'manual-pizza-story-azor',
    name: 'פיצה סטורי',
    type: 'fast_food',
    category: 'dairy',
    address: 'המצודה 6, אזור',
    cityId: 'אזור',
    location: { latitude: 32.021, longitude: 34.882 },
    locationPrecision: 'city',
    phone: '03-5552525',
    website: 'https://pizza-story.co.il',
    instagram: 'https://www.instagram.com/pizza_story_il',
    menu: 'https://pizza-story.co.il/?page_id=200',
    kosherType: 'badatz_beit_yosef',
    certifiedBy: 'בד"ץ בית יוסף',
    source: 'manual',
    lastVerifiedAt: '2026-07-29',
  },

  // ממפיס תל אביב קרליבך 20
  {
    id: 'manual-memphis-tlv',
    name: 'ממפיס',
    type: 'restaurant',
    category: 'meat',
    description: 'המבורגר פרימיום כשר',
    address: 'קרליבך 20, תל אביב',
    cityId: 'תל אביב',
    location: { latitude: 32.0712, longitude: 34.7938 },
    locationPrecision: 'city',
    website: 'https://www.memphis.co.il',
    menu: 'https://www.memphis.co.il/תפריטים/',
    instagram: 'https://www.instagram.com/memphis_burger',
    facebook: 'https://www.facebook.com/memphiskosherburger',
    certifiedBy: 'בד"ץ בית יוסף',
    kosherType: 'mehadrin',
    source: 'manual',
    lastVerifiedAt: '2026-07-29',
  },

  // דבוש נהריה (new branch)
  {
    id: 'manual-dabush-nahariya',
    name: 'דבוש שווארמה',
    type: 'restaurant',
    category: 'meat',
    address: 'הגעתון 29, נהריה',
    cityId: 'נהריה',
    location: { latitude: 33.006, longitude: 35.096 },
    locationPrecision: 'city',
    website: 'https://www.dabush.co.il',
    instagram: 'https://www.instagram.com/dabush_shawarma',
    facebook: 'https://www.facebook.com/DabushShawarma',
    kosherType: 'rabanut',
    certifiedBy: 'רבנות נהריה',
    source: 'manual',
    lastVerifiedAt: '2026-07-29',
  },
]

// ─── Apply deletions ──────────────────────────────────────────────────────
places = places.filter(p => !DELETE_IDS.has(p.id))
const afterDelete = places.length
console.log(`Deleted: ${before - afterDelete} records`)

// ─── Apply updates ────────────────────────────────────────────────────────
let updated = 0
places = places.map(p => {
  const patch = UPDATES[p.id]
  if (!patch) return p
  updated++
  // Merge: null values mean "remove the field"
  const result = { ...p }
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) {
      delete result[k]
    } else {
      result[k] = v
    }
  }
  return result
})
console.log(`Updated: ${updated} records`)

// ─── Apply additions ──────────────────────────────────────────────────────
places.push(...NEW_RECORDS)
console.log(`Added: ${NEW_RECORDS.length} records`)

// ─── Write output ─────────────────────────────────────────────────────────
const out = JSON.stringify(places, null, 2)
writeFileSync(DATA_PATH, out, 'utf-8')
console.log(`\nDone. Total records: ${before} → ${places.length}`)
console.log(`File written: ${DATA_PATH}`)

import { Ionicons } from '@expo/vector-icons';
import { Place, PlaceType } from '../types';

/** Hebrew label for a place type. */
export const placeTypeLabel: Record<PlaceType, string> = {
  restaurant: 'מסעדה כשרה',
  fast_food: 'מזון מהיר',
  cafe: 'בית קפה',
  coffee_cart: 'עגלת קפה',
  juice_bar: 'שייקים ומיצים',
  ice_cream_parlor: 'גלידרייה',
  bakery: 'מאפייה / בית קפה',
  winery: 'יקב כשר',
  synagogue: 'בית כנסת',
  mikveh: 'מקווה',
  chabad_house: 'בית חב״ד',
  tzaddik_grave: 'קבר צדיק',
};

/** Names that already carry a "synagogue" prefix, in full or abbreviated form. */
const SYNAGOGUE_PREFIX = /^(בית\s+ה?כנסת|בתי\s+כנסת|ביהכ|בי["״]כ|ביה["״]כ)/;

/**
 * Name to show for a place. Synagogues are displayed as "בית כנסת <name>"
 * unless the name already starts with that prefix. Display-only — the stored
 * `name` is never modified.
 */
export function displayPlaceName(place: { type: PlaceType; name?: string }): string {
  const name = (place.name ?? '').trim();
  if (place.type !== 'synagogue' || !name) return name;
  return SYNAGOGUE_PREFIX.test(name) ? name : `בית כנסת ${name}`;
}

const PLACE_EMOJI: Record<PlaceType, string> = {
  restaurant:       '🍽️',
  fast_food:        '🍔',
  cafe:             '☕',
  coffee_cart:      '🛒',
  juice_bar:        '🧃',
  ice_cream_parlor: '🍦',
  bakery:           '🥐',
  winery:           '🍷',
  synagogue:        '🕍',
  mikveh:           '💧',
  chabad_house:     '🕎',
  tzaddik_grave:    '🪦',
};

const TAG_EMOJI: Record<string, string> = {
  pizza:        '🍕',
  burger:       '🍔',
  shawarma:     '🌯',
  שווארמה:     '🌯',
  שוורמה:      '🌯',
  kebab:        '🌯',
  falafel:      '🧆',
  hummus:       '🫘',
  sushi:        '🍣',
  japanese:     '🍣',
  coffee_shop:  '☕',
  coffee:       '☕',
  cafe:         '☕',
  steak_house:  '🥩',
  grill:        '🥩',
  barbecue:     '🥩',
  meat:         '🥩',
  Meat:         '🥩',
  Cholent:      '🍲',
  cholent:      '🍲',
  sandwich:     '🥪',
  סנדוויץ:     '🥪',
  ice_cream:    '🍦',
  pastry:       '🥐',
  bagel:        '🥐',
  cake:         '🎂',
  italian:      '🍝',
  pasta:        '🍝',
  noodle:       '🍜',
  chinese:      '🍜',
  asian:        '🍜',
  thai:         '🍜',
  'pan-asian':  '🍜',
  פאן_אסייתי:  '🍜',
  fish:         '🐟',
  chicken:      '🍗',
  hot_dog:      '🌭',
  sausage:      '🌭',
  poke:         '🥗',
  hawaiian:     '🥗',
  salad:        '🥗',
  soup:         '🍲',
  moroccan:     '🫕',
  ethiopian:    '🫕',
  georgian:     '🫕',
  french:       '🥐',
  breakfast:    '🥞',
};

// Ordered: more specific patterns first to avoid wrong matches
// Note: \b does not work with Hebrew — use explicit spacing or avoid
const NAME_EMOJI: Array<[RegExp, string]> = [
  [/פיצ/i,                                    '🍕'],
  [/pizza/i,                                   '🍕'],
  [/שווארמ|שוורמ/i,                           '🌯'],
  [/shawarma/i,                                '🌯'],
  [/פלאפל/i,                                   '🧆'],
  [/falafel/i,                                 '🧆'],
  [/חומוס|חמוס|מסבח/i,                        '🫘'],
  [/hummus/i,                                  '🫘'],
  [/סושי/i,                                    '🍣'],
  [/sushi/i,                                   '🍣'],
  [/בורגר|המבורגר/i,                          '🍔'],
  [/burger/i,                                  '🍔'],
  [/מאפיי|קונדיטוריה/i,                       '🥐'],
  [/bakery|patisserie/i,                       '🥐'],
  [/cake\b/i,                                  '🎂'],
  [/פסטה/i,                                    '🍝'],
  [/pasta/i,                                   '🍝'],
  [/נודל|noodle/i,                             '🍜'],
  [/סיני|chinese|אסיאתי|asian|תאילנד|thai/i,  '🍜'],
  [/פוקה|poke/i,                               '🥗'],
  [/דגים|fish/i,                               '🐟'],
  [/גליד/i,                                    '🍦'],
  [/שייק|מיצ[יה]/i,                           '🧃'],
  [/יקב/i,                                     '🍷'],
  [/סטייק|steak/i,                             '🥩'],
  [/\bmeat\b/i,                                '🥩'],
  [/שניצל|schnitzel/i,                         '🍗'],
  [/chicken/i,                                 '🍗'],
  [/cofix|קופיקס/i,                            '☕'],
  [/קפה|cafe\b/i,                              '☕'],
  [/בשרייה|steakhouse/i,                       '🥩'],
  [/מרקיה|soup/i,                              '🍲'],
];

/** Returns the best emoji for a place: tag → name → type. */
export function getPlaceEmoji(place: Place): string {
  for (const tag of place.tags ?? []) {
    const emoji = TAG_EMOJI[tag];
    if (emoji) return emoji;
  }
  const name = place.name ?? '';
  for (const [pattern, emoji] of NAME_EMOJI) {
    if (pattern.test(name)) return emoji;
  }
  return PLACE_EMOJI[place.type];
}

/** Icon for a place type (used on map pins, cards, headers). */
export const placeTypeIcon: Record<PlaceType, keyof typeof Ionicons.glyphMap> = {
  restaurant: 'restaurant',
  fast_food: 'fast-food',
  cafe: 'cafe',
  coffee_cart: 'cafe-outline',
  juice_bar: 'nutrition',
  ice_cream_parlor: 'ice-cream',
  bakery: 'storefront-outline',
  winery: 'wine',
  synagogue: 'business',
  mikveh: 'water',
  chabad_house: 'home',
  tzaddik_grave: 'flower-outline',
};

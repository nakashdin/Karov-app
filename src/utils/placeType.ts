import { Ionicons } from '@expo/vector-icons';
import { PlaceType } from '../types';

/** Hebrew label for a place type. */
export const placeTypeLabel: Record<PlaceType, string> = {
  restaurant: 'מסעדה כשרה',
  fast_food: 'מזון מהיר',
  cafe: 'בית קפה',
  coffee_cart: 'עגלת קפה',
  winery: 'יקב כשר',
  synagogue: 'בית כנסת',
  mikveh: 'מקווה',
  chabad_house: 'בית חב״ד',
  tzaddik_grave: 'קבר צדיק',
};

/** Icon for a place type (used on map pins, cards, headers). */
export const placeTypeIcon: Record<PlaceType, keyof typeof Ionicons.glyphMap> = {
  restaurant: 'restaurant',
  fast_food: 'fast-food',
  cafe: 'cafe',
  coffee_cart: 'cafe-outline',
  winery: 'wine',
  synagogue: 'business',
  mikveh: 'water',
  chabad_house: 'home',
  tzaddik_grave: 'flower-outline',
};

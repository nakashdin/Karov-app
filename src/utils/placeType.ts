import { Ionicons } from '@expo/vector-icons';
import { PlaceType } from '../types';

/** Hebrew label for a place type. */
export const placeTypeLabel: Record<PlaceType, string> = {
  restaurant: 'מסעדה כשרה',
  synagogue: 'בית כנסת',
  mikveh: 'מקווה',
  chabad_house: 'בית חב״ד',
  tzaddik_grave: 'קבר צדיק',
};

/** Icon for a place type (used on map pins, cards, headers). */
export const placeTypeIcon: Record<PlaceType, keyof typeof Ionicons.glyphMap> = {
  restaurant: 'restaurant',
  synagogue: 'business',
  mikveh: 'water',
  chabad_house: 'home',
  tzaddik_grave: 'flower-outline',
};

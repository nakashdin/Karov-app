import { City } from '../../types';

/**
 * ADMIN SEED DATA — cities.
 * Edit this list to control which cities appear in the filter.
 * `id` values are stable keys referenced by places (`Place.cityId`).
 */
export const CITIES_SEED: City[] = [
  { id: 'jerusalem', name: 'ירושלים' },
  { id: 'tel_aviv', name: 'תל אביב' },
  { id: 'bnei_brak', name: 'בני ברק' },
  { id: 'haifa', name: 'חיפה' },
  { id: 'beer_sheva', name: 'באר שבע' },
  { id: 'netanya', name: 'נתניה' },
  { id: 'petah_tikva', name: 'פתח תקווה' },
  { id: 'ashdod', name: 'אשדוד' },
];

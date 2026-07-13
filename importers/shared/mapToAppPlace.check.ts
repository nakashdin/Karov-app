/**
 * Compile-time (and tiny runtime) check for mapToAppPlace.
 *
 * The point is type-checking: the `: Place` annotations below only compile if
 * the mapper truly returns a valid app `Place`. Running it under Node also
 * exercises the city/address fallback path.
 *
 * Run:   node importers/shared/mapToAppPlace.check.ts
 * Check: npx tsc -p importers/tsconfig.json --noEmit
 */
import type { Place } from '../../src/types/place.ts';
import type { SynagoguePlace } from './types.ts';
import { mapSynagogueToPlace } from './mapToAppPlace.ts';
import { isMain } from './utils.ts';

const full: SynagoguePlace = {
  type: 'synagogue',
  source: 'openstreetmap',
  sourceId: 'node/123456',
  name: 'בית כנסת לדוגמה',
  lat: 32.0853,
  lng: 34.7818,
  city: 'תל אביב-יפו',
  address: 'הרצל 10, תל אביב-יפו',
  phone: '03-1234567',
  verifiedAt: '2026-06-17',
  isActive: true,
};

// If these assignments compile, the mapper's return type IS a valid Place.
const mapped: Place = mapSynagogueToPlace(full);

// Fallback path: no city, no address, no phone.
const minimal: Place = mapSynagogueToPlace({
  type: 'synagogue',
  source: 'openstreetmap',
  sourceId: 'way/9',
  name: 'מינימלי',
  lat: 31.5,
  lng: 34.9,
  verifiedAt: '2026-06-17',
  isActive: true,
});

if (isMain(import.meta.url)) {
  console.log('mapped  :', JSON.stringify(mapped));
  console.log('minimal :', JSON.stringify(minimal));
  console.log('minimal cityId  =', JSON.stringify(minimal.cityId), '(empty = unknown city, by design)');
  console.log('minimal address =', JSON.stringify(minimal.address));
  console.log('OK — mapper compiles and runs.');
}

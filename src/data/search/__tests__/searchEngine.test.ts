import { Place } from '../../../types';
import { buildIndex, searchPlaces, _resetIndex } from '../searchEngine';

function place(over: Partial<Place> & Pick<Place, 'id' | 'name'>): Place {
  return {
    type: 'restaurant',
    cityId: 'tlv',
    address: '',
    location: { latitude: 32, longitude: 34 },
    ...over,
  } as Place;
}

const PLACES: Place[] = [
  place({ id: 'pizza-hut-tlv', name: 'פיצה האט', address: 'דיזנגוף 100' }),
  place({ id: 'pizza-hut-jlm', name: 'פיצה האט', address: 'יפו 20', cityId: 'jlm' }),
  place({ id: 'pizza-shmuel', name: 'פיצה שמואל', address: 'אלנבי 5' }),
  place({ id: 'burger', name: 'בורגר האט', address: 'הרצל 3' }),
  place({
    id: 'shul',
    name: 'בית כנסת אוהל יעקב',
    type: 'synagogue',
    nusach: 'ספרד',
    address: 'ביאליק 8',
  }),
  place({ id: 'niqqud', name: 'מִזְנוֹן הַכֶּרֶם' }),
  place({ id: 'gershayim', name: 'חב״ד מרכז' }),
];

const CITIES = new Map([
  ['tlv', 'תל אביב'],
  ['jlm', 'ירושלים'],
]);

beforeEach(() => {
  _resetIndex();
  buildIndex(PLACES, CITIES);
});

describe('searchPlaces', () => {
  it('returns null before the index is built', () => {
    _resetIndex();
    expect(searchPlaces('פיצה')).toBeNull();
  });

  it('returns null for an empty query', () => {
    expect(searchPlaces('')).toBeNull();
    expect(searchPlaces('   ')).toBeNull();
  });

  it('finds every place matching a single term', () => {
    const r = searchPlaces('פיצה')!;
    expect(r).toEqual(expect.arrayContaining(['pizza-hut-tlv', 'pizza-hut-jlm', 'pizza-shmuel']));
  });

  it('combines multi-word queries with AND', () => {
    // "פיצה האט" must not return פיצה שמואל or בורגר האט.
    const r = searchPlaces('פיצה האט')!;
    expect(r.sort()).toEqual(['pizza-hut-jlm', 'pizza-hut-tlv']);
  });

  it('ranks name matches above address matches', () => {
    const r = searchPlaces('האט')!;
    expect(r[0]).not.toBe('shul');
  });

  it('searches by city name through the injected lookup', () => {
    const r = searchPlaces('ירושלים')!;
    expect(r).toContain('pizza-hut-jlm');
    expect(r).not.toContain('pizza-hut-tlv');
  });

  it('searches synagogues by nusach', () => {
    expect(searchPlaces('ספרד')).toContain('shul');
  });

  it('ignores niqqud in the query', () => {
    expect(searchPlaces('מזנון')).toContain('niqqud');
  });

  it('ignores gershayim in the query', () => {
    expect(searchPlaces('חבד')).toContain('gershayim');
  });

  it('supports prefix matching', () => {
    expect(searchPlaces('פיצ')!.length).toBeGreaterThan(0);
  });

  it('drops single-character terms rather than matching everything', () => {
    expect(searchPlaces('א')).toEqual([]);
  });
});

describe('buildIndex', () => {
  it('is idempotent — a second call with different data is ignored', () => {
    buildIndex([place({ id: 'other', name: 'משהו אחר' })], new Map());
    expect(searchPlaces('משהו')).toEqual([]);
    expect(searchPlaces('פיצה')!.length).toBeGreaterThan(0);
  });
});

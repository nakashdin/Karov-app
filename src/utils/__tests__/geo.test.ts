import { distanceKm, formatDistance, nearestBy, sortedByDistance, withinRadius } from '../geo';

const TEL_AVIV = { latitude: 32.0853, longitude: 34.7818 };
const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };
const HAIFA = { latitude: 32.794, longitude: 34.9896 };

const t = { common: { meters: 'מ׳', km: 'ק״מ' } } as never;

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(TEL_AVIV, TEL_AVIV)).toBe(0);
  });

  it('matches the known Tel Aviv → Jerusalem great-circle distance (~54 km)', () => {
    expect(distanceKm(TEL_AVIV, JERUSALEM)).toBeCloseTo(54.1, 0);
  });

  it('matches the known Tel Aviv → Haifa great-circle distance (~81 km)', () => {
    expect(distanceKm(TEL_AVIV, HAIFA)).toBeCloseTo(81.3, 0);
  });

  it('is symmetric', () => {
    expect(distanceKm(TEL_AVIV, JERUSALEM)).toBeCloseTo(distanceKm(JERUSALEM, TEL_AVIV), 10);
  });

  it('handles antipodal-ish points without NaN', () => {
    const d = distanceKm({ latitude: 90, longitude: 0 }, { latitude: -90, longitude: 0 });
    expect(Number.isNaN(d)).toBe(false);
    expect(d).toBeCloseTo(20015, -1);
  });
});

describe('formatDistance', () => {
  it('renders sub-kilometre distances in metres, rounded to 10', () => {
    expect(formatDistance(0.234, t)).toBe('230 מ׳');
  });

  it('never renders less than 10 metres', () => {
    expect(formatDistance(0.001, t)).toBe('10 מ׳');
  });

  it('renders kilometres with one decimal from 1 km up', () => {
    expect(formatDistance(1, t)).toBe('1.0 ק״מ');
    expect(formatDistance(12.34, t)).toBe('12.3 ק״מ');
  });
});

describe('nearestBy', () => {
  const origin = { latitude: 32, longitude: 34.8 };
  const items = [
    { id: 'far', location: { latitude: 33, longitude: 35 } },
    { id: 'near', location: { latitude: 32.01, longitude: 34.8 } },
    { id: 'mid', location: { latitude: 32.3, longitude: 34.85 } },
    { id: 'farther', location: { latitude: 29.6, longitude: 34.95 } },
  ];

  it('returns the k nearest, nearest first', () => {
    expect(nearestBy(origin, items, 2).map((i) => i.id)).toEqual(['near', 'mid']);
  });

  it('returns everything when k exceeds the list length', () => {
    expect(nearestBy(origin, items, 99)).toHaveLength(items.length);
  });

  it('returns an empty array for k <= 0', () => {
    expect(nearestBy(origin, items, 0)).toEqual([]);
    expect(nearestBy(origin, items, -1)).toEqual([]);
  });

  it('handles an empty input', () => {
    expect(nearestBy(origin, [], 5)).toEqual([]);
  });

  it('agrees with a full sort truncated to k', () => {
    const viaSort = sortedByDistance(origin, items).slice(0, 3).map((i) => i.id);
    expect(nearestBy(origin, items, 3).map((i) => i.id)).toEqual(viaSort);
  });

  it('does not mutate the input', () => {
    const copy = [...items];
    nearestBy(origin, items, 2);
    expect(items).toEqual(copy);
  });
});

describe('sortedByDistance', () => {
  const origin = { latitude: 32, longitude: 34.8 };

  it('orders nearest first', () => {
    const items = [
      { id: 'c', location: { latitude: 33, longitude: 35 } },
      { id: 'a', location: { latitude: 32.01, longitude: 34.8 } },
      { id: 'b', location: { latitude: 32.3, longitude: 34.85 } },
    ];
    expect(sortedByDistance(origin, items).map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });

  it('does not mutate the input', () => {
    const items = [
      { id: 'b', location: { latitude: 33, longitude: 35 } },
      { id: 'a', location: { latitude: 32.01, longitude: 34.8 } },
    ];
    const copy = [...items];
    sortedByDistance(origin, items);
    expect(items).toEqual(copy);
  });
});

describe('withinRadius', () => {
  const origin = { latitude: 32, longitude: 34.8 };
  const items = [
    { id: 'in', location: { latitude: 32.01, longitude: 34.8 } },
    { id: 'out', location: { latitude: 29.6, longitude: 34.95 } },
  ];

  it('keeps only items inside the radius', () => {
    expect(withinRadius(origin, items, 20).map((i) => i.id)).toEqual(['in']);
  });

  it('is inclusive at the boundary', () => {
    const d = distanceKm(origin, items[0].location);
    expect(withinRadius(origin, items, d).map((i) => i.id)).toContain('in');
  });

  it('returns everything for a huge radius, nearest first', () => {
    expect(withinRadius(origin, items, 99999).map((i) => i.id)).toEqual(['in', 'out']);
  });
});

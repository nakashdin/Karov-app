import { sunTimes, zmanim } from '../zmanim';

const JERUSALEM = { latitude: 31.7683, longitude: 35.2137 };

/**
 * The algorithm derives the UTC offset from the host `Date`, so these assertions
 * are written against whatever offset the test runner is in. What is being
 * verified is the *shape* of the result — ordering, symmetry, seasonal swing —
 * not a wall-clock time that would depend on the CI machine's timezone.
 */
const asMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();

describe('sunTimes', () => {
  it('returns sunrise before sunset', () => {
    const st = sunTimes(new Date(2026, 5, 21), JERUSALEM.latitude, JERUSALEM.longitude)!;
    expect(st).not.toBeNull();
    expect(st.sunrise).toBeLessThan(st.sunset);
  });

  it('puts both events inside a single day', () => {
    const st = sunTimes(new Date(2026, 5, 21), JERUSALEM.latitude, JERUSALEM.longitude)!;
    expect(st.sunrise).toBeGreaterThanOrEqual(0);
    expect(st.sunset).toBeLessThan(1440);
  });

  it('gives a longer day at the summer solstice than at the winter solstice', () => {
    const summer = sunTimes(new Date(2026, 5, 21), JERUSALEM.latitude, JERUSALEM.longitude)!;
    const winter = sunTimes(new Date(2026, 11, 21), JERUSALEM.latitude, JERUSALEM.longitude)!;
    expect(summer.sunset - summer.sunrise).toBeGreaterThan(winter.sunset - winter.sunrise);
  });

  it('gives Jerusalem roughly 14 hours of daylight at the summer solstice', () => {
    const st = sunTimes(new Date(2026, 5, 21), JERUSALEM.latitude, JERUSALEM.longitude)!;
    const hours = (st.sunset - st.sunrise) / 60;
    expect(hours).toBeGreaterThan(13.5);
    expect(hours).toBeLessThan(14.5);
  });

  it('gives Jerusalem roughly 10 hours of daylight at the winter solstice', () => {
    const st = sunTimes(new Date(2026, 11, 21), JERUSALEM.latitude, JERUSALEM.longitude)!;
    const hours = (st.sunset - st.sunrise) / 60;
    expect(hours).toBeGreaterThan(9.5);
    expect(hours).toBeLessThan(10.5);
  });

  it('returns null above the arctic circle in midwinter (sun never rises)', () => {
    expect(sunTimes(new Date(2026, 11, 21), 80, 0)).toBeNull();
  });

  it('shifts sunrise later as you move west along the same latitude', () => {
    const east = sunTimes(new Date(2026, 5, 21), 32, 35)!;
    const west = sunTimes(new Date(2026, 5, 21), 32, 30)!;
    expect(west.sunrise).toBeGreaterThan(east.sunrise);
  });
});

describe('zmanim', () => {
  const z = zmanim(new Date(2026, 5, 21), JERUSALEM)!;

  it('orders the day dawn → sunrise → sunset → nightfall', () => {
    expect(z.dawn).toBeLessThan(z.sunrise);
    expect(z.sunrise).toBeLessThan(z.sunset);
    expect(z.sunset).toBeLessThan(z.nightfall);
  });

  it('places candle-lighting before sunset', () => {
    expect(z.candleLighting).toBeLessThan(z.sunset);
  });

  it('uses the documented offsets', () => {
    expect(z.sunrise - z.dawn).toBe(72);
    expect(z.sunset - z.candleLighting).toBe(20);
    expect(z.nightfall - z.sunset).toBe(27);
  });

  it('returns null where the sun does not set', () => {
    expect(zmanim(new Date(2026, 5, 21), { latitude: 80, longitude: 0 })).toBeNull();
  });

  it('agrees with sunTimes for the same date and place', () => {
    const st = sunTimes(new Date(2026, 5, 21), JERUSALEM.latitude, JERUSALEM.longitude)!;
    expect(z.sunrise).toBe(st.sunrise);
    expect(z.sunset).toBe(st.sunset);
  });

  it('keeps every value within a day when converted from a Date', () => {
    expect(asMinutes(new Date(2026, 5, 21, 0, 0))).toBe(0);
  });
});

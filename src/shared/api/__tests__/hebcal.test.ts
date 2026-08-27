import { calendarUrl, converterUrl, shabbatIsraelUrl, zmanimUrl } from '../hebcal';

const params = (url: string) => Object.fromEntries(new URL(url).searchParams.entries());

describe('hebcal URLs', () => {
  it('keeps the halachic Shabbat parameters that were always used', () => {
    // m=50 (havdalah) and b=18 (candle lighting) are psak, not defaults.
    expect(params(shabbatIsraelUrl())).toMatchObject({
      cfg: 'json',
      geo: 'il',
      m: '50',
      b: '18',
      M: 'on',
    });
  });

  it('requests the Israel calendar, not the diaspora one', () => {
    // `i=on` is the only parameter that selects Israel. The app used to send
    // `l=IL`, which Hebcal does not recognise, and silently got the diaspora
    // schedule: an extra day of yom tov on Pesach and Sukkot.
    const p = params(calendarUrl(2026, 8));
    expect(p.i).toBe('on');
    expect(p.l).toBeUndefined();
  });

  it('agrees with the Shabbat endpoint about which country it is describing', () => {
    // These two disagreeing is what produced contradictory yom tov labels.
    expect(params(calendarUrl(2026, 8)).i).toBe('on');
    expect(params(shabbatIsraelUrl()).geo).toBe('il');
  });

  it('asks the calendar for the requested year and month', () => {
    expect(params(calendarUrl(2026, 8))).toMatchObject({ year: '2026', month: '8', yt: 'G' });
  });

  it('converts a Gregorian date to Hebrew', () => {
    expect(params(converterUrl(2026, 8, 22))).toMatchObject({
      gy: '2026',
      gm: '8',
      gd: '22',
      g2h: '1',
    });
  });

  it('omits `strict` unless asked for it', () => {
    expect(params(converterUrl(2026, 8, 22)).strict).toBeUndefined();
    expect(params(converterUrl(2026, 8, 22, true)).strict).toBe('1');
  });

  it('pins zmanim to Jerusalem time', () => {
    expect(params(zmanimUrl(32.08, 34.78, '2026-08-22'))).toMatchObject({
      latitude: '32.08',
      longitude: '34.78',
      date: '2026-08-22',
      tzid: 'Asia/Jerusalem',
    });
  });
});

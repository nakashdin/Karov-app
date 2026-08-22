import { buildLeafletHtml, ISRAEL_CENTER, DEFAULT_ZOOM } from '../leafletHtml';
import { Place } from '../../../types';

const place = (over: Partial<Place> & Pick<Place, 'id' | 'name'>): Place =>
  ({
    type: 'restaurant',
    cityId: 'tlv',
    address: '',
    location: { latitude: 32, longitude: 34.8 },
    ...over,
  }) as Place;

const PLACES = [
  place({ id: 'a', name: 'פיצה', category: 'dairy' }),
  place({ id: 'b', name: 'מקווה', type: 'mikveh' }),
  place({ id: 'c', name: 'חב״ד', type: 'chabad_house' }),
];

describe('buildLeafletHtml', () => {
  const html = buildLeafletHtml(PLACES, null);

  it('is a complete standalone document', () => {
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('fetches no third-party script or stylesheet', () => {
    // The whole point of vendoring: nothing external is pulled into the WebView.
    expect(html).not.toContain('unpkg.com');
    expect(html).not.toMatch(/<script[^>]+src=/);
    expect(html).not.toMatch(/<link[^>]+stylesheet/);
  });

  it('inlines the Leaflet runtime and the marker-cluster plugin', () => {
    expect(html).toContain('MarkerClusterGroup');
    expect(html.length).toBeGreaterThan(150_000);
  });

  it('embeds every place as a marker', () => {
    for (const p of PLACES) expect(html).toContain(`"id":"${p.id}"`);
  });

  it('still points tiles at OpenStreetMap with attribution', () => {
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).toContain('OpenStreetMap');
  });

  it('centres on Israel when there is no user location', () => {
    expect(html).toContain(JSON.stringify(ISRAEL_CENTER));
    expect(html).toContain(String(DEFAULT_ZOOM));
  });

  it('centres on the user when a location is given', () => {
    const withUser = buildLeafletHtml(PLACES, { latitude: 31.7, longitude: 35.2 });
    expect(withUser).toContain('31.7');
  });

  it('honours an explicit centre and zoom', () => {
    const focused = buildLeafletHtml(PLACES, null, { initialCenter: [32.1, 34.9], initialZoom: 15 });
    expect(focused).toContain('[32.1,34.9]');
  });

  it('handles an empty place list', () => {
    expect(() => buildLeafletHtml([], null)).not.toThrow();
  });
});

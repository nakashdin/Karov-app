import { GeoPoint, Place } from '../../types';
import type { Tokens } from '../../theme';
import { categoryColorFor } from '../../utils/kosher';
import {
  LEAFLET_CSS,
  LEAFLET_JS,
  CLUSTER_CSS,
  CLUSTER_DEFAULT_CSS,
  CLUSTER_JS,
} from './vendor/leaflet-assets';

/** Default center / zoom (central Israel) when there is no user location. */
export const ISRAEL_CENTER: [number, number] = [31.5, 34.9]; // [lat, lng]
export const DEFAULT_ZOOM = 7.5;
export const USER_ZOOM = 13;

/** Marker color: food category for restaurants, water-blue for mikvahs, violet for Chabad houses, brand green otherwise. */
function markerColor(place: Place, theme: Tokens): string {
  if (place.type === 'chabad_house') return theme.chabad;
  if (place.category) return categoryColorFor(theme)[place.category];
  if (place.type === 'mikveh') return theme.map.clusterAccent;
  return theme.primary;
}

/**
 * Build a self-contained Leaflet + OpenStreetMap HTML document.
 *
 * Leaflet and markercluster are inlined from src/components/map/vendor rather
 * than fetched from a CDN: the map then works with no connection (every place
 * is already bundled), and no third-party script is loaded into a WebView whose
 * originWhitelist is ['*']. Only the map TILES still need the network.
 *
 * Free, no API key, no Google. Rendered inside a WebView (native) or an
 * iframe (web). Tapping a marker posts `{type:'select', id}` back to the host:
 * via `window.ReactNativeWebView` on native, or `window.parent` on web.
 */
export function buildLeafletHtml(
  places: Place[],
  userLocation: GeoPoint | null,
  theme: Tokens,
  options?: { initialCenter?: [number, number]; initialZoom?: number; highlightId?: string },
): string {
  const markers = places.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.location.latitude,
    lng: p.location.longitude,
    color: markerColor(p, theme),
  }));

  const center = options?.initialCenter
    ? options.initialCenter
    : userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : ISRAEL_CENTER;
  const zoom = options?.initialZoom
    ?? (userLocation ? USER_ZOOM : DEFAULT_ZOOM);
  const highlightId = options?.highlightId ?? null;
  const user = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : null;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>${LEAFLET_CSS}</style>
  <style>${CLUSTER_CSS}</style>
  <style>${CLUSTER_DEFAULT_CSS}</style>
  <style>html,body,#map{height:100%;margin:0;padding:0;background:#f7f8fa}
  .pin{width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.18),0 2px 6px rgba(0,0,0,0.18)}</style>
</head>
<body>
  <div id="map"></div>
  <script>${LEAFLET_JS}</script>
  <script>${CLUSTER_JS}</script>
  <script>
    var PLACES = ${JSON.stringify(markers)};
    var USER = ${JSON.stringify(user)};
    var HIGHLIGHT_ID = ${JSON.stringify(highlightId)};
    var map = L.map('map', { zoomControl: false }).setView(${JSON.stringify(center)}, ${zoom});
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(map);

    function selectPlace(id) {
      var msg = JSON.stringify({ type: 'select', id: id });
      if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(msg); }
      else if (window.parent) { window.parent.postMessage(msg, '*'); }
    }

    var cluster = L.markerClusterGroup({
      chunkedLoading: true,
      showCoverageOnHover: false,
      maxClusterRadius: 60
    });
    PLACES.forEach(function (p) {
      var isHL = HIGHLIGHT_ID && p.id === HIGHLIGHT_ID;
      var size = isHL ? 34 : 24;
      var icon = L.divIcon({
        className: '',
        html: '<div class="pin" style="background:' + p.color + ';width:' + size + 'px;height:' + size + 'px;' + (isHL ? 'border-width:4px;box-shadow:0 0 0 2px rgba(0,0,0,0.25),0 4px 10px rgba(0,0,0,0.25)' : '') + '"></div>',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2]
      });
      var mk = L.marker([p.lat, p.lng], { icon: icon });
      mk.on('click', function () { selectPlace(p.id); });
      cluster.addLayer(mk);
    });
    map.addLayer(cluster);

    if (USER) {
      L.circleMarker(USER, {
        radius: 8, color: '${theme.map.markerLabel}', weight: 3, fillColor: '${theme.primary}', fillOpacity: 1
      }).addTo(map);
    }
  </script>
</body>
</html>`;
}

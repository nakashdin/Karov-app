import { GeoPoint, Place } from '../../types';
import { colors } from '../../theme';
import { categoryColor } from '../../utils/kosher';

/** Default center / zoom (central Israel) when there is no user location. */
export const ISRAEL_CENTER: [number, number] = [31.5, 34.9]; // [lat, lng]
export const DEFAULT_ZOOM = 7.5;
export const USER_ZOOM = 13;

/** Marker color: food category for restaurants, water-blue for mikvahs, violet for Chabad houses, brand green otherwise. */
function markerColor(place: Place): string {
  if (place.type === 'chabad_house') return colors.chabad;
  if (place.category) return categoryColor[place.category];
  if (place.type === 'mikveh') return '#2b8cbe';
  return colors.primary;
}

/**
 * Build a self-contained Leaflet + OpenStreetMap HTML document.
 *
 * Free, no API key, no Google. Rendered inside a WebView (native) or an
 * iframe (web). Tapping a marker posts `{type:'select', id}` back to the host:
 * via `window.ReactNativeWebView` on native, or `window.parent` on web.
 */
export function buildLeafletHtml(
  places: Place[],
  userLocation: GeoPoint | null,
): string {
  const markers = places.map((p) => ({
    id: p.id,
    name: p.name,
    lat: p.location.latitude,
    lng: p.location.longitude,
    color: markerColor(p),
  }));

  const center = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : ISRAEL_CENTER;
  const zoom = userLocation ? USER_ZOOM : DEFAULT_ZOOM;
  const user = userLocation
    ? [userLocation.latitude, userLocation.longitude]
    : null;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;background:#f7f8fa}
  .pin{width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.18),0 2px 6px rgba(0,0,0,0.18)}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <script>
    var PLACES = ${JSON.stringify(markers)};
    var USER = ${JSON.stringify(user)};
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
      var icon = L.divIcon({
        className: '',
        html: '<div class="pin" style="background:' + p.color + '"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      var mk = L.marker([p.lat, p.lng], { icon: icon });
      mk.on('click', function () { selectPlace(p.id); });
      cluster.addLayer(mk);
    });
    map.addLayer(cluster);

    if (USER) {
      L.circleMarker(USER, {
        radius: 8, color: '#ffffff', weight: 3, fillColor: '${colors.primary}', fillOpacity: 1
      }).addTo(map);
    }
  </script>
</body>
</html>`;
}

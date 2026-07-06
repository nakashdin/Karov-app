import React, { useEffect, useMemo } from 'react';
import type { MapViewProps } from './MapView';
import { buildLeafletHtml } from './leafletHtml';

/**
 * Web map: the same Leaflet + OpenStreetMap document rendered in an <iframe>.
 * On web the React renderer is react-dom, so an intrinsic <iframe> works and
 * we avoid relying on react-native-webview's web support.
 */
export function LeafletMap({
  places,
  userLocation,
  onSelectPlace,
}: MapViewProps) {
  const html = useMemo(
    () => buildLeafletHtml(places, userLocation ?? null),
    [places, userLocation],
  );

  // Marker taps arrive as window postMessages from the iframe.
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === 'select') {
          const place = places.find((p) => p.id === data.id);
          if (place) onSelectPlace(place);
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [places, onSelectPlace]);

  return (
    <iframe
      title="map"
      srcDoc={html}
      style={{ border: 0, width: '100%', height: '100%' }}
    />
  );
}

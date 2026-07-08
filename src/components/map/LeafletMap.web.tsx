import React, { useEffect, useMemo } from 'react';
import type { MapViewProps } from './MapView';
import { buildLeafletHtml } from './leafletHtml';

export function LeafletMap({
  places,
  userLocation,
  onSelectPlace,
  initialCenter,
  initialZoom,
  highlightId,
}: MapViewProps) {
  const html = useMemo(
    () => buildLeafletHtml(places, userLocation ?? null, { initialCenter, initialZoom, highlightId }),
    [places, userLocation, initialCenter, initialZoom, highlightId],
  );

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

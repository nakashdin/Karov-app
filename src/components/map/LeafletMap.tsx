import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type { MapViewProps } from './MapView';
import { buildLeafletHtml } from './leafletHtml';

/**
 * Native map: Leaflet + OpenStreetMap inside a WebView.
 * Works in Expo Go and dev/standalone builds — no native map module needed.
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

  return (
    <WebView
      style={styles.web}
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      // Re-create the WebView when the map content changes so it recenters.
      key={userLocation ? 'with-user' : 'no-user'}
      onMessage={(event) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          if (data.type === 'select') {
            const place = places.find((p) => p.id === data.id);
            if (place) onSelectPlace(place);
          }
        } catch {
          // ignore malformed messages
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: 'transparent' },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GeoPoint, Place } from '../../types';
import { LeafletMap } from './LeafletMap';

export interface MapViewProps {
  places: Place[];
  userLocation?: GeoPoint | null;
  onSelectPlace: (place: Place) => void;
}

/**
 * Map abstraction. Backed by Leaflet + OpenStreetMap (free, no API key, no
 * Google) rendered in a WebView on native and an iframe on web — so it works
 * everywhere: Expo Go, dev/standalone builds, and the browser preview.
 *
 * Metro picks LeafletMap.web.tsx on web and LeafletMap.tsx on native.
 */
export function MapView(props: MapViewProps) {
  return (
    <View style={styles.fill}>
      <LeafletMap {...props} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

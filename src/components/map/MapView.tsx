import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GeoPoint, Place } from '../../types';
import { LeafletMap } from './LeafletMap';

export interface MapViewProps {
  places: Place[];
  userLocation?: GeoPoint | null;
  onSelectPlace: (place: Place) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  highlightId?: string;
}

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

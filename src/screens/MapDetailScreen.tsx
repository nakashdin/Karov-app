import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapView } from '../components/map/MapView';
import { PlaceBottomCard } from '../components/map/PlaceBottomCard';
import { makeStyles, shadow, spacing, useTheme } from '../theme';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation } from '../context/LocationContext';
import { usePlace } from '../hooks/usePlace';
import { Place } from '../types';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'MapDetail'>;

export function MapDetailScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { place: focusPlace } = usePlace(params.placeId);
  const { places } = usePlaces({});
  const { location } = useSharedLocation();
  const [selected, setSelected] = useState<Place | null>(null);

  // Pre-select the focused place once loaded.
  useEffect(() => {
    if (focusPlace) setSelected(focusPlace);
  }, [focusPlace]);

  const center: [number, number] | undefined = focusPlace
    ? [focusPlace.location.latitude, focusPlace.location.longitude]
    : undefined;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.mapWrap}>
        <MapView
          places={places}
          userLocation={location}
          onSelectPlace={setSelected}
          initialCenter={center}
          initialZoom={15}
          highlightId={params.placeId}
        />

        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={22} color={theme.text} />
        </Pressable>

        {selected && (
          <PlaceBottomCard
            place={selected}
            onClose={() => setSelected(null)}
            onOpenDetails={() => {
              const id = selected.id;
              setSelected(null);
              navigation.navigate('PlaceDetail', { id });
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.background },
  mapWrap: { flex: 1, overflow: 'hidden' },
  backBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: t.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    ...shadow.raised,
  },
}));

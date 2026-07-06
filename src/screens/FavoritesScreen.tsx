import React, { useMemo } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { PlaceCard } from '../components/PlaceCard';
import { EmptyState } from '../components/EmptyState';
import { Loading } from '../components/Loading';
import { spacing } from '../theme';
import { t } from '../i18n';
import { usePlaces } from '../hooks/usePlaces';
import { useSharedLocation } from '../context/LocationContext';
import { useFavorites } from '../context/FavoritesContext';
import { distanceKm } from '../utils/geo';
import { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function FavoritesScreen() {
  const navigation = useNavigation<Nav>();
  const { places, loading } = usePlaces();
  const { location } = useSharedLocation();
  const { favorites } = useFavorites();

  const data = useMemo(
    () => places.filter((p) => favorites.includes(p.id)),
    [places, favorites],
  );

  if (loading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen padded>
      <FlatList
        data={data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title={t.favorites.empty}
            hint={t.favorites.emptyHint}
            icon="heart-outline"
          />
        }
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            distanceKm={location ? distanceKm(location, item.location) : null}
            onPress={() => navigation.navigate('PlaceDetail', { id: item.id })}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
});

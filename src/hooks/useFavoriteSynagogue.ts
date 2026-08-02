import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Place } from '../types/place';

const KEY = '@karov/favoriteSynagogue';

export function useFavoriteSynagogue() {
  const [favorite, setFavoriteState] = useState<Place | null>(null);

  const load = useCallback(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      if (!raw) { setFavoriteState(null); return; }
      try { setFavoriteState(JSON.parse(raw)); } catch {}
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const setFavorite = useCallback(async (place: Place) => {
    setFavoriteState(place);
    await AsyncStorage.setItem(KEY, JSON.stringify(place)).catch(() => {});
  }, []);

  const clearFavorite = useCallback(async () => {
    setFavoriteState(null);
    await AsyncStorage.removeItem(KEY).catch(() => {});
  }, []);

  return { favorite, setFavorite, clearFavorite, refresh: load };
}

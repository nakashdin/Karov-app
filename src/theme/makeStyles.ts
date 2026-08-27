/**
 * Theme-aware `StyleSheet.create`.
 *
 * `StyleSheet.create` is called once per scheme and the result is cached in the
 * closure, so switching to dark mode builds the sheet a second time and never
 * again. Calling `StyleSheet.create` inside a render — the naive way to make
 * styles depend on a theme — rebuilds every style object on every render and
 * defeats the native style registry.
 *
 *   const useStyles = makeStyles((t) => ({
 *     card: { backgroundColor: t.surface, borderColor: t.border },
 *   }));
 *
 *   function Card() {
 *     const styles = useStyles();
 *     return <View style={styles.card} />;
 *   }
 */

import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

import { useTheme } from './ThemeContext';
import { type ColorScheme, type Tokens } from './tokens';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T> | NamedStyles<unknown>>(
  factory: (theme: Tokens) => T & NamedStyles<T>,
): () => T {
  const cache = new Map<ColorScheme, T>();

  return function useStyles(): T {
    const theme = useTheme();

    const cached = cache.get(theme.scheme);
    if (cached) return cached;

    const created = StyleSheet.create(factory(theme));
    cache.set(theme.scheme, created);
    return created;
  };
}

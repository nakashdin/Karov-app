import React, { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export const DESKTOP_BREAKPOINT = 900;

interface ScreenProps {
  children: ReactNode;
  /** Apply default horizontal padding. */
  padded?: boolean;
  style?: ViewStyle;
  edges?: Edge[];
}

/** Standard screen wrapper: safe-area + app background. */
export function Screen({
  children,
  padded = false,
  style,
  edges = ['top'],
}: ScreenProps) {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View
        style={[
          styles.content,
          isDesktop && { maxWidth: 1200, alignSelf: 'center' as const },
          !isDesktop && Platform.OS === 'web' && { maxWidth: 480, alignSelf: 'center' as const },
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});

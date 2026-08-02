import React, { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

export const DESKTOP_BREAKPOINT = 900;

interface ScreenProps {
  children: ReactNode;
  padded?: boolean;
  style?: ViewStyle;
  edges?: Edge[];
}

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
          Platform.OS === 'web' && { width: '100%' },
          isDesktop && styles.contentDesktop,
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
    ...(Platform.OS === 'web'
      ? { maxWidth: 480, alignSelf: 'center' as const }
      : {}),
  },
  contentDesktop: {
    maxWidth: 1200,
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});

import React, { ReactNode } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

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
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View style={[styles.content, padded && styles.padded, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const WEB_MAX_WIDTH = 480;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    ...(Platform.OS === 'web'
      ? {
          maxWidth: WEB_MAX_WIDTH,
          alignSelf: 'center' as const,
        }
      : {}),
  },
  padded: {
    paddingHorizontal: spacing.lg,
  },
});

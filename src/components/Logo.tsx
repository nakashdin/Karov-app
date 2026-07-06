import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

interface LogoProps {
  size?: number;
  /** 'dark' = frosted white on deep green (for splash/login top), 'light' = full green on white */
  variant?: 'light' | 'dark';
}

export function Logo({ size = 64, variant = 'light' }: LogoProps) {
  const borderRadius = size * 0.25;
  const fontSize = size * 0.56;
  const lineHeight = size * 0.72;
  const dotSize = size * 0.14;
  const dotOffset = size * 0.1;

  const bgColor = variant === 'dark' ? 'rgba(255,255,255,0.15)' : colors.primary;

  return (
    <View
      style={[
        styles.box,
        { width: size, height: size, borderRadius, backgroundColor: bgColor },
      ]}
    >
      <Text style={[styles.letter, { fontSize, lineHeight }]}>ק</Text>
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            bottom: dotOffset,
            right: dotOffset,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
  },
  dot: {
    position: 'absolute',
    backgroundColor: '#C8A752',
  },
});

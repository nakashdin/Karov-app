import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../../theme';
import { SourceRef } from '../../data/jewish-content/types';

interface Props {
  source: SourceRef;
  style?: ViewStyle;
  size?: 'small' | 'medium';
}

export function ContentSource({ source, style, size = 'small' }: Props) {
  const isSmall = size === 'small';
  return (
    <View style={[styles.row, style]}>
      <Text style={isSmall ? styles.workSmall : styles.workMedium}>
        {source.work.title}
      </Text>
      {source.reference ? (
        <>
          <Text style={isSmall ? styles.sepSmall : styles.sepMedium}> · </Text>
          <Text style={isSmall ? styles.refSmall : styles.refMedium}>
            {source.reference}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  workSmall: { fontSize: 10, color: colors.textMuted, fontWeight: '600', textAlign: 'right' },
  refSmall: { fontSize: 10, color: colors.textMuted, textAlign: 'right' },
  sepSmall: { fontSize: 10, color: colors.textFaint },
  workMedium: { fontSize: 13, color: colors.textMuted, fontWeight: '600', textAlign: 'right' },
  refMedium: { fontSize: 13, color: colors.textMuted, textAlign: 'right' },
  sepMedium: { fontSize: 13, color: colors.textFaint },
});

import { TextStyle } from 'react-native';
import { colors } from './colors';

/**
 * Shared text styles. `writingDirection: 'rtl'` keeps Hebrew text aligned
 * correctly even on the rare device where RTL is not globally forced.
 */
export const typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: colors.text,
    writingDirection: 'rtl',
  },
  h2: {
    fontSize: 19,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: colors.text,
    writingDirection: 'rtl',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.text,
    writingDirection: 'rtl',
  },
  caption: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    writingDirection: 'rtl',
  },
};

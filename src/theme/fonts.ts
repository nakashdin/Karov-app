import React from 'react';
import { StyleSheet, Text as RNText, TextInput as RNTextInput } from 'react-native';
import {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
} from '@expo-google-fonts/heebo';

/** Font map passed to `useFonts`. */
export const HEEBO_FONTS = {
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_600SemiBold,
  Heebo_700Bold,
  Heebo_800ExtraBold,
};

/**
 * Custom fonts don't honor `fontWeight` automatically — each weight is its own
 * family. Map the numeric weight used in styles to the matching Heebo family.
 */
function weightToFamily(weight?: string | number): string {
  switch (String(weight)) {
    case '500':
      return 'Heebo_500Medium';
    case '600':
      return 'Heebo_600SemiBold';
    case '700':
    case 'bold':
      return 'Heebo_700Bold';
    case '800':
    case '900':
      return 'Heebo_800ExtraBold';
    default:
      return 'Heebo_400Regular';
  }
}

let patched = false;

/**
 * Apply Heebo to every <Text>/<TextInput> app-wide by picking the family from
 * the resolved fontWeight — so we don't have to touch each component. Styles
 * that set their own `fontFamily` are left untouched.
 */
export function applyHeeboFont(): void {
  if (patched) return;
  patched = true;

  [RNText, RNTextInput].forEach((Component) => {
    const comp = Component as any;
    const original = comp.render;
    if (typeof original !== 'function') return;

    comp.render = function patchedRender(...args: any[]) {
      const element = original.apply(this, args) as React.ReactElement<{
        style?: unknown;
      }>;
      const flat = (StyleSheet.flatten(element.props.style) || {}) as {
        fontFamily?: string;
        fontWeight?: string | number;
      };
      if (flat.fontFamily) return element; // respect explicit fonts
      return React.cloneElement(element, {
        style: [
          { fontFamily: weightToFamily(flat.fontWeight) },
          element.props.style,
        ],
      } as Partial<{ style?: unknown }>);
    };
  });
}

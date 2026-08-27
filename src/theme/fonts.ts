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
 *
 * ── Known broken on native since RN 0.86 ─────────────────────────────────────
 * This works by monkey-patching `Component.render`, which only exists on a
 * `React.forwardRef` exotic component. react-native-web's `Text` still is one,
 * so this keeps working on web. React Native 0.86's own `Text`/`TextInput` are
 * no longer `forwardRef` — they moved to Flow's `component(...)` syntax and
 * export a plain function with no `.render` — so `original` below is
 * `undefined` on native and the whole patch silently no-ops. Every Heebo
 * weight still gets loaded and still blocks first paint in App.tsx; native
 * just never applies any of them, and ships the system font instead.
 *
 * Fixing this for real needs a different mechanism — an `<AppText>` /
 * `<AppTextInput>` wrapper adopted app-wide, or a theme-level default — not a
 * runtime patch of a component shape RN no longer guarantees. That's real
 * product work (every `<Text>` import in the app), out of scope for this
 * function; what changed here is that the failure is no longer silent, so it
 * can't ship unnoticed the way it did through the RN 0.86 upgrade.
 */
export function applyHeeboFont(
  targets: readonly unknown[] = [RNText, RNTextInput],
): void {
  if (patched) return;
  patched = true;

  let anyPatched = false;

  targets.forEach((Component) => {
    const comp = Component as any;
    const original = comp.render;
    if (typeof original !== 'function') return;
    anyPatched = true;

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

  if (!anyPatched) {
    // Cannot throw here — this runs at module load in App.tsx, before
    // ErrorBoundary mounts, on every platform including the ones where the
    // patch still works. Throwing would take down app boot entirely just to
    // report a font problem. console.error is the loudest safe option.
    console.error(
      '[applyHeeboFont] Could not patch Text/TextInput — Heebo will not render on this ' +
        'platform; the system font is being used instead. RN Text/TextInput are no ' +
        'longer React.forwardRef (see the comment on applyHeeboFont in src/theme/fonts.ts). ' +
        'This blocks the native release: verify on a real iOS/Android build before shipping.',
    );
  }
}

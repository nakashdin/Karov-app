/**
 * The light scheme as a plain object.
 *
 * This is the static escape hatch, kept because a colour is sometimes needed
 * where a hook cannot run: `StyleSheet.create` at module scope, the navigation
 * theme built before the tree mounts, and the Leaflet HTML string.
 *
 * Anything inside a component should call `useTheme()` instead — values read
 * from here do not follow the colour scheme, so a screen styled this way stays
 * light when the rest of the app goes dark.
 */

import { lightTokens, type Tokens } from './tokens';

export const colors = lightTokens;

/** Token names that resolve to a single colour string. */
export type ColorName = {
  [K in keyof Tokens]: Tokens[K] extends string ? K : never;
}[keyof Tokens];

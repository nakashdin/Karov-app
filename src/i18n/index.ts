import { he } from './he';

/**
 * Single translation namespace for the MVP (Hebrew only).
 * Screens import `t` so swapping in a real i18n engine later is a one-file change.
 */
export const t = he;
export type Strings = typeof he;

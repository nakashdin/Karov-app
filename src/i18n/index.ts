import { he } from './he';
import { en } from './en';
import { es } from './es';
import { ru } from './ru';
import { fr } from './fr';

export type Locale = 'he' | 'en' | 'es' | 'ru' | 'fr';

// Recursively widens literal string types to `string` so all locales are assignable.
type DeepLoosen<T> =
  T extends string ? string :
  T extends (...args: infer A) => string ? (...args: A) => string :
  { [K in keyof T]: DeepLoosen<T[K]> };

export type Strings = DeepLoosen<typeof he>;

export const locales: Record<Locale, Strings> = { he, en, es, ru, fr };

export const t = he;

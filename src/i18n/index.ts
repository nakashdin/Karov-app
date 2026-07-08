import { he } from './he';
import { en } from './en';
import { es } from './es';
import { ru } from './ru';
import { fr } from './fr';

export type Locale = 'he' | 'en' | 'es' | 'ru' | 'fr';
export type Strings = typeof he;

export const locales: Record<Locale, Strings> = { he, en, es, ru, fr };

export const t = he;

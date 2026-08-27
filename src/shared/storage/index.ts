export { StorageKey, StorageKeyFor, DYNAMIC_KEY_PREFIXES } from './keys';
export type { StorageKeyName } from './keys';
export {
  getString,
  setString,
  getJSON,
  setJSON,
  remove,
  removeMany,
  clearDynamicCaches,
  isString,
  isStringArray,
  isRecord,
} from './storage';
export type { Guard } from './storage';

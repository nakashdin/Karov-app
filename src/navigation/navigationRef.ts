import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

/**
 * Lets components rendered beside the navigator — rather than inside a screen —
 * route the user somewhere. `useNavigation` has no context out there.
 */
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

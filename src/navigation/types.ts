import { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom-tab routes. */
export type TabParamList = {
  Home: undefined;
  Favorites: undefined;
  /** tehillimChapter opens the reader straight on that chapter */
  Brachot: { tehillimChapter?: number } | undefined;
  Zmanim: undefined;
  Community: undefined;
};

/** Root stack routes (tabs + pushed screens). */
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  LocationPermission: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  PlaceDetail: { id: string };
  MapDetail: { placeId: string };
  Report: { placeId: string };
  List: { focus?: boolean; radiusKm?: number; selectSynagogue?: boolean } | undefined;
  AddPlace: undefined;
  ParashaDetail: undefined;
  KashruyotFilter: { placeType: 'restaurant' | 'fast_food' | 'cafe' | 'coffee_cart' };
  WhatsAround: undefined;
  FoodList: { radiusKm?: number } | undefined;
  KarovLev: undefined;
  KarovLevOnboarding: { isEditing?: boolean } | undefined;
  MiddotSelection: { isEditing?: boolean } | undefined;
  KarovLevContent: { id: string };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

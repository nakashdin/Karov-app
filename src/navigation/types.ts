import { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom-tab routes. */
export type TabParamList = {
  Home: undefined;
  Favorites: undefined;
  Brachot: undefined;
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
  List: { focus?: boolean } | undefined;
  AddPlace: undefined;
  ParashaDetail: undefined;
  KashruyotFilter: { placeType: 'restaurant' | 'fast_food' | 'cafe' | 'coffee_cart' };
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

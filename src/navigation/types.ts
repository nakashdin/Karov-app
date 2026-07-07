import { NavigatorScreenParams } from '@react-navigation/native';

/** Bottom-tab routes. */
export type TabParamList = {
  Home: undefined;
  Map: undefined;
  List: { focus?: boolean } | undefined;
  Brachot: undefined;
  Zmanim: undefined;
};

/** Root stack routes (tabs + pushed screens). */
export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  LocationPermission: undefined;
  Tabs: NavigatorScreenParams<TabParamList>;
  PlaceDetail: { id: string };
  Report: { placeId: string };
  Favorites: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

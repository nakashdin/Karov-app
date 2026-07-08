import React from 'react';
import { Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabParamList } from './types';
import { colors, sizes } from '../theme';
import { HomeScreen } from '../screens/HomeScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { BrachotScreen } from '../screens/BrachotScreen';
import { ZmanimScreen } from '../screens/ZmanimScreen';
import { CommunityScreen } from '../screens/CommunityScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<
  Exclude<keyof TabParamList, 'Home'>,
  { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }
> = {
  Favorites: { on: 'heart',  off: 'heart-outline' },
  Brachot:   { on: 'book',   off: 'book-outline' },
  Zmanim:    { on: 'time',   off: 'time-outline' },
  Community: { on: 'people', off: 'people-outline' },
};

export function TabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'web'
    ? 0
    : Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 8);

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          height: Platform.OS === 'web' ? 80 : sizes.tabBar + bottomInset,
          paddingBottom: Platform.OS === 'web' ? 18 : bottomInset + 6,
          paddingTop: 10,
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, focused }) => {
          if (route.name === 'Home') {
            return (
              <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>
                🏠
              </Text>
            );
          }
          const key = route.name as keyof typeof ICONS;
          return (
            <Ionicons
              name={focused ? ICONS[key].on : ICONS[key].off}
              size={27}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'מועדפים' }} />
      <Tab.Screen name="Brachot"   component={BrachotScreen}   options={{ title: 'ברכות' }} />
      <Tab.Screen name="Zmanim"    component={ZmanimScreen}    options={{ title: 'זמני היום' }} />
      <Tab.Screen name="Community" component={CommunityScreen} options={{ title: 'קהילה' }} />
      <Tab.Screen name="Home"      component={HomeScreen}      options={{ title: 'בית' }} />
    </Tab.Navigator>
  );
}

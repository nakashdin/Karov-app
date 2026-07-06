import React from 'react';
import { Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabParamList } from './types';
import { colors, sizes } from '../theme';
import { t } from '../i18n';
import { HomeScreen } from '../screens/HomeScreen';
import { MapScreen } from '../screens/MapScreen';
import { ListScreen } from '../screens/ListScreen';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<
  Exclude<keyof TabParamList, 'Home'>,
  { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }
> = {
  Map: { on: 'map', off: 'map-outline' },
  List: { on: 'list', off: 'list-outline' },
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
      {/* RTL order: List (left) → Map (center) → Home (right) */}
      <Tab.Screen
        name="List"
        component={ListScreen}
        options={{ title: t.tabs.list }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ title: t.tabs.map }}
      />
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t.tabs.home }}
      />
    </Tab.Navigator>
  );
}

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { colors } from '../theme';
import { t } from '../i18n';
import { TabNavigator } from './TabNavigator';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { AddPlaceScreen } from '../screens/AddPlaceScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LocationPermissionScreen } from '../screens/LocationPermissionScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false, animation: 'none' }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false, animation: 'fade' }}
      />
      <Stack.Screen
        name="LocationPermission"
        component={LocationPermissionScreen}
        options={{ headerShown: false, animation: 'slide_from_left' }}
      />
      <Stack.Screen
        name="Tabs"
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PlaceDetail"
        component={PlaceDetailScreen}
        options={{ title: '', headerTransparent: false }}
      />
      <Stack.Screen
        name="Report"
        component={ReportScreen}
        options={{ title: t.report.title, presentation: 'modal' }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: t.favorites.title }}
      />
      <Stack.Screen
        name="AddPlace"
        component={AddPlaceScreen}
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}

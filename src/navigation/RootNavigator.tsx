import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { colors } from '../theme';
import { useLanguage } from '../context/LanguageContext';
import { TabNavigator } from './TabNavigator';
import { PlaceDetailScreen } from '../screens/PlaceDetailScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { AddPlaceScreen } from '../screens/AddPlaceScreen';
import { MapDetailScreen } from '../screens/MapDetailScreen';
import { ListScreen } from '../screens/ListScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { LocationPermissionScreen } from '../screens/LocationPermissionScreen';
import { ParashaDetailScreen } from '../screens/ParashaDetailScreen';
import { KashruyotFilterScreen } from '../screens/KashruyotFilterScreen';
import { WhatsAroundScreen } from '../screens/WhatsAroundScreen';
import { FoodListScreen } from '../screens/FoodListScreen';
import { KarovLevScreen } from '../screens/KarovLevScreen';
import { KarovLevContentScreen } from '../screens/KarovLevContentScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { t } = useLanguage();
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
      <Stack.Screen name="Splash"             component={SplashScreen}            options={{ headerShown: false, animation: 'none' }} />
      <Stack.Screen name="Login"              component={LoginScreen}             options={{ headerShown: false, animation: 'fade' }} />
      <Stack.Screen name="LocationPermission" component={LocationPermissionScreen} options={{ headerShown: false, animation: 'slide_from_left' }} />
      <Stack.Screen name="Tabs"               component={TabNavigator}            options={{ headerShown: false }} />
      <Stack.Screen name="List"               component={ListScreen}              options={{ headerShown: false }} />
      <Stack.Screen name="PlaceDetail"        component={PlaceDetailScreen}       options={{ title: '', headerTransparent: false }} />
      <Stack.Screen name="MapDetail"          component={MapDetailScreen}         options={{ headerShown: false, animation: 'slide_from_left' }} />
      <Stack.Screen name="Report"             component={ReportScreen}            options={{ title: t.report.title, presentation: 'modal' }} />
      <Stack.Screen name="AddPlace"           component={AddPlaceScreen}          options={{ headerShown: false, presentation: 'modal' }} />
      <Stack.Screen name="ParashaDetail"      component={ParashaDetailScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="KashruyotFilter"   component={KashruyotFilterScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="WhatsAround"      component={WhatsAroundScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="FoodList"         component={FoodListScreen}           options={{ headerShown: false }} />
      <Stack.Screen name="KarovLev"         component={KarovLevScreen}           options={{ headerShown: false, animation: 'slide_from_left' }} />
      <Stack.Screen name="KarovLevContent"  component={KarovLevContentScreen}    options={{ headerShown: false, animation: 'slide_from_left' }} />
    </Stack.Navigator>
  );
}

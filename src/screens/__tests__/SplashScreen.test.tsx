import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, render } from '@testing-library/react-native';
import { SplashScreen } from '../SplashScreen';
import { navigationRef } from '../../navigation/navigationRef';
import { ThemeProvider } from '../../theme';

jest.mock('../../utils/locationPermission', () => ({
  resolveLocationSilently: jest.fn().mockResolvedValue(null),
}));

const Stack = createNativeStackNavigator();

function TargetScreen() {
  return <Text>target</Text>;
}

function LoginScreen() {
  return <Text>login</Text>;
}

function TestApp({ initialState }: { initialState?: object }) {
  return (
    <ThemeProvider>
      <NavigationContainer ref={navigationRef} initialState={initialState as never}>
        <Stack.Navigator>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Target" component={TargetScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

async function settle(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SplashScreen — recovery after a deep link is backed out of', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null); // unauthenticated
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('routes away on a plain cold start after the animated delay', async () => {
    const { findByText } = await render(<TestApp />);

    await settle(2500);

    expect(await findByText('login')).toBeTruthy();
  });

  it(
    'does not dead-end when the user backs out of a deep-linked target — ' +
      'this is the bug: a deep link resolves to [Splash, Target] (linking.ts), ' +
      "so Splash mounts unfocused and its routing timer never starts while " +
      'Target is on screen. Popping back to Splash must route away again, not ' +
      'sit frozen forever with a spent one-shot timer.',
    async () => {
      // Same shape React Navigation's linking resolver builds for a deep link:
      // Splash beneath the shared target, target focused.
      const { findByText } = await render(
        <TestApp
          initialState={{
            index: 1,
            routes: [{ name: 'Splash' }, { name: 'Target' }],
          }}
        />,
      );
      expect(await findByText('target')).toBeTruthy();

      // Nothing should have started routing yet — Splash was never focused.
      await settle(3000);
      expect(await findByText('target')).toBeTruthy();

      // Pop back to Splash, the way Android/browser Back does.
      await act(async () => {
        navigationRef.current?.goBack();
        await Promise.resolve();
      });

      // Recovery must not require waiting through another animated delay.
      await settle(100);

      expect(await findByText('login')).toBeTruthy();
    },
  );
});

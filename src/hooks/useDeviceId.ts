import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@karov/deviceId';

function generateDeviceId(): string {
  const ts = Date.now().toString(36);
  // Math.random is fine here — this runs once per install, not in render
  const r1 = Math.random().toString(36).slice(2, 8);
  const r2 = Math.random().toString(36).slice(2, 8);
  return `dev_${ts}_${r1}${r2}`;
}

export async function getOrCreateDeviceId(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (stored) return stored;
    const newId = generateDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
    return newId;
  } catch {
    // AsyncStorage unavailable — return a session-stable fallback
    return 'default_device';
  }
}

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId).catch(() => setDeviceId('default_device'));
  }, []);

  return deviceId;
}

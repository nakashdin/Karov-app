import { Linking, Platform } from 'react-native';
import { GeoPoint } from '../types';

export async function openWaze(point: GeoPoint, _label?: string): Promise<void> {
  const { latitude, longitude } = point;
  const appUrl = `waze://?ll=${latitude},${longitude}&navigate=yes`;
  const webUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

export async function openGoogleMaps(point: GeoPoint, label?: string): Promise<void> {
  const { latitude, longitude } = point;
  const query = label ? encodeURIComponent(label) : `${latitude},${longitude}`;
  // On iOS use maps:// scheme; on Android use geo://; both fall back to web
  const iosUrl = `maps://?q=${query}&ll=${latitude},${longitude}`;
  const androidUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${query})`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

  try {
    if (Platform.OS === 'ios') {
      const canOpen = await Linking.canOpenURL(iosUrl);
      await Linking.openURL(canOpen ? iosUrl : webUrl);
    } else if (Platform.OS === 'android') {
      const canOpen = await Linking.canOpenURL(androidUrl);
      await Linking.openURL(canOpen ? androidUrl : webUrl);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch {
    await Linking.openURL(webUrl);
  }
}

/** Open the phone dialer for a given number. */
export async function callPhone(phone: string): Promise<void> {
  const scheme = Platform.OS === 'android' ? 'tel:' : 'telprompt:';
  await Linking.openURL(`${scheme}${phone.replace(/\s/g, '')}`);
}

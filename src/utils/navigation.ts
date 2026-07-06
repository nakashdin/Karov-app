import { Linking, Platform } from 'react-native';
import { GeoPoint } from '../types';

/**
 * Navigate to a coordinate with Waze.
 *
 * Tries the `waze://` app scheme first; if Waze isn't installed (or the scheme
 * can't be opened), falls back to the Waze web link, which opens in the
 * browser and still deep-links into the app when present.
 */
export async function openWaze(point: GeoPoint, _label?: string): Promise<void> {
  const { latitude, longitude } = point;
  const appUrl = `waze://?ll=${latitude},${longitude}&navigate=yes`;
  const webUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;

  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch {
    // Last resort — let the OS handle the web URL.
    await Linking.openURL(webUrl);
  }
}

/** Open the phone dialer for a given number. */
export async function callPhone(phone: string): Promise<void> {
  const scheme = Platform.OS === 'android' ? 'tel:' : 'telprompt:';
  await Linking.openURL(`${scheme}${phone.replace(/\s/g, '')}`);
}

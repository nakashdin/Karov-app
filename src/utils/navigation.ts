import { Linking, Platform } from 'react-native';
import { GeoPoint } from '../types';

export async function openWaze(point: GeoPoint, label?: string, address?: string): Promise<void> {
  const { latitude, longitude } = point;
  const dest = address ? encodeURIComponent(address) : `${latitude},${longitude}`;
  // Use address as search query for precision; also send coords as fallback hint
  const appUrl = address
    ? `waze://?q=${dest}&navigate=yes`
    : `waze://?ll=${latitude},${longitude}&navigate=yes`;
  const webUrl = address
    ? `https://waze.com/ul?q=${dest}&navigate=yes`
    : `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

export async function openGoogleMaps(point: GeoPoint, label?: string, address?: string): Promise<void> {
  const { latitude, longitude } = point;
  const dest = address ? encodeURIComponent(address) : `${latitude},${longitude}`;
  const query = label ? encodeURIComponent(label) : dest;
  const iosUrl = `comgooglemaps://?daddr=${dest}&directionsmode=driving`;
  const androidUrl = `google.navigation:q=${dest}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}`;

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

export async function openAppleMaps(point: GeoPoint, label?: string, address?: string): Promise<void> {
  const { latitude, longitude } = point;
  const dest = address ? encodeURIComponent(address) : `${latitude},${longitude}`;
  const url = address
    ? `maps://?address=${dest}`
    : `maps://?daddr=${latitude},${longitude}`;
  const webUrl = address
    ? `https://maps.apple.com/?address=${dest}`
    : `https://maps.apple.com/?daddr=${latitude},${longitude}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    await Linking.openURL(canOpen ? url : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

/** Open the phone dialer for a given number. */
export async function callPhone(phone: string): Promise<void> {
  const scheme = Platform.OS === 'android' ? 'tel:' : 'telprompt:';
  await Linking.openURL(`${scheme}${phone.replace(/\s/g, '')}`);
}

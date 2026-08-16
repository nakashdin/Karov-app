import { Linking, Platform } from 'react-native';
import { GeoPoint } from '../types';

/**
 * Build the destination search term.
 *
 * Navigation apps resolve a business name far better than a bare address —
 * many of our places sit on addresses with no house number ("קיבוץ מעלה
 * החמישה", "מושב יוגב"), and searching that alone lands the driver in the
 * middle of the village rather than at the business. Leading with the name
 * and keeping the address as context gives the app the best chance of
 * finding the venue itself.
 */
function destinationQuery(label?: string, address?: string): string | null {
  const parts = [label?.trim(), address?.trim()].filter(Boolean);
  if (!parts.length) return null;
  // Drop the address when it is already contained in the label, or vice versa.
  const unique = parts.filter((p, i) => !parts.some((q, j) => j < i && q!.includes(p!)));
  return unique.join(', ');
}

/**
 * Whether to hand the native app scheme to the OS.
 *
 * On web, Linking.canOpenURL always resolves true, so a `waze://` URL would be
 * handed to a desktop browser that cannot open it and nothing would happen.
 * Browsers always get the https link.
 */
const preferNativeScheme = Platform.OS !== 'web';

async function openFirstAvailable(appUrl: string, webUrl: string): Promise<void> {
  if (!preferNativeScheme) {
    await Linking.openURL(webUrl);
    return;
  }
  try {
    const canOpenApp = await Linking.canOpenURL(appUrl);
    await Linking.openURL(canOpenApp ? appUrl : webUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

export async function openWaze(point: GeoPoint, label?: string, address?: string): Promise<void> {
  const { latitude, longitude } = point;
  const ll = `${latitude},${longitude}`;
  const query = destinationQuery(label, address);
  // `q` searches, `ll` centres that search on our own coordinates — so a name
  // match wins when Waze knows the venue, and we still land on the right spot
  // when it does not.
  const params = query
    ? `q=${encodeURIComponent(query)}&ll=${ll}&navigate=yes`
    : `ll=${ll}&navigate=yes`;
  await openFirstAvailable(`waze://?${params}`, `https://waze.com/ul?${params}`);
}

export async function openGoogleMaps(point: GeoPoint, label?: string, address?: string): Promise<void> {
  const { latitude, longitude } = point;
  const ll = `${latitude},${longitude}`;
  const query = destinationQuery(label, address);
  const dest = encodeURIComponent(query ?? ll);
  const iosUrl = `comgooglemaps://?daddr=${dest}&directionsmode=driving`;
  const androidUrl = `google.navigation:q=${dest}`;
  // `destination` takes the name; `destination_place_id` is unavailable to us,
  // so the coordinates ride along as the map centre.
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`;

  if (Platform.OS === 'ios')          await openFirstAvailable(iosUrl, webUrl);
  else if (Platform.OS === 'android') await openFirstAvailable(androidUrl, webUrl);
  else                                await Linking.openURL(webUrl);
}

export async function openAppleMaps(point: GeoPoint, label?: string, address?: string): Promise<void> {
  const { latitude, longitude } = point;
  const ll = `${latitude},${longitude}`;
  const query = destinationQuery(label, address);
  // `q` names the destination, `sll` biases the search near our coordinates,
  // and `daddr` guarantees a route even if the name resolves to nothing.
  const params = query
    ? `q=${encodeURIComponent(query)}&sll=${ll}&daddr=${ll}&dirflg=d`
    : `daddr=${ll}&dirflg=d`;
  await openFirstAvailable(`maps://?${params}`, `https://maps.apple.com/?${params}`);
}

/** Open the phone dialer for a given number. */
export async function callPhone(phone: string): Promise<void> {
  const scheme = Platform.OS === 'android' ? 'tel:' : 'telprompt:';
  await Linking.openURL(`${scheme}${phone.replace(/\s/g, '')}`);
}

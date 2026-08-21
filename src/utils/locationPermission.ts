import { Platform, Linking } from 'react-native';
import { GeoPoint } from '../types';

/* ------------------------------------------------------------------ *
 * Generic location-permission layer.
 *
 * Native (iOS / Android build): expo-location + Linking.openSettings()
 *   -> tapping "open settings" lands directly on the app's permission page.
 * Web (Safari / Chrome / PWA): navigator.geolocation. Browsers are not
 *   allowed to open the OS settings app, so we best-effort the Android
 *   intent and otherwise show exact per-platform instructions.
 * ------------------------------------------------------------------ */

export type DenialReason = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export type LocationRequestResult =
  | { ok: true; location: GeoPoint }
  | { ok: false; reason: DenialReason; canAskAgain: boolean };

export type HostOS = 'ios' | 'android' | 'other';

export interface HostInfo {
  os: HostOS;
  isWeb: boolean;
  /** Web only: running as an installed home-screen app rather than a browser tab. */
  standalone: boolean;
  /** Web only: rough browser family, used to pick the right instructions. */
  browser: 'safari' | 'chrome' | 'firefox' | 'samsung' | 'edge' | 'other';
}

const GEO_OPTS = { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 };

export function getHostInfo(): HostInfo {
  if (Platform.OS === 'ios') return { os: 'ios', isWeb: false, standalone: false, browser: 'other' };
  if (Platform.OS === 'android') return { os: 'android', isWeb: false, standalone: false, browser: 'other' };

  if (typeof navigator === 'undefined') {
    return { os: 'other', isWeb: true, standalone: false, browser: 'other' };
  }

  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS 13+ reports itself as a Mac, but it has a touch screen.
    (/Macintosh/.test(ua) && (navigator as any).maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);

  let browser: HostInfo['browser'] = 'other';
  if (/SamsungBrowser/.test(ua)) browser = 'samsung';
  else if (/EdgA?\//.test(ua) || /Edg\//.test(ua)) browser = 'edge';
  else if (/FxiOS|Firefox/.test(ua)) browser = 'firefox';
  else if (/CriOS|Chrome|Chromium/.test(ua)) browser = 'chrome';
  else if (/Safari/.test(ua)) browser = 'safari';

  let standalone = false;
  try {
    standalone =
      (navigator as any).standalone === true ||
      (typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches);
  } catch {
    standalone = false;
  }

  return { os: isIOS ? 'ios' : isAndroid ? 'android' : 'other', isWeb: true, standalone, browser };
}

/**
 * Ask for the current position.
 *
 * On web this MUST be invoked straight from a user gesture with no prior
 * `await` — iOS Safari drops the gesture and silently denies otherwise.
 * That is why this function is not `async`: the geolocation call fires
 * synchronously and only the result is promised.
 */
export function requestLocation(): Promise<LocationRequestResult> {
  if (Platform.OS !== 'web') return requestLocationNative();

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported', canAskAgain: false });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        }),
      (err) => {
        const reason: DenialReason =
          err.code === err.PERMISSION_DENIED
            ? 'denied'
            : err.code === err.TIMEOUT
              ? 'timeout'
              : 'unavailable';
        // A browser that already holds a "block" decision keeps denying until
        // the user changes it in settings — no point re-prompting in place.
        resolve({ ok: false, reason, canAskAgain: reason !== 'denied' });
      },
      GEO_OPTS,
    );
  });
}

async function requestLocationNative(): Promise<LocationRequestResult> {
  try {
    const Location = require('expo-location');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) {
      return { ok: false, reason: 'denied', canAskAgain: perm.canAskAgain !== false };
    }
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return {
      ok: true,
      location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
    };
  } catch {
    return { ok: false, reason: 'unavailable', canAskAgain: true };
  }
}

export type PermissionSnapshot = 'granted' | 'denied' | 'prompt' | 'unknown';

/**
 * Read the current permission state without prompting.
 * Used to auto-continue when the user comes back from the settings app.
 */
export async function checkLocationPermission(): Promise<PermissionSnapshot> {
  if (Platform.OS !== 'web') {
    try {
      const Location = require('expo-location');
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.granted) return 'granted';
      return perm.canAskAgain === false ? 'denied' : 'prompt';
    } catch {
      return 'unknown';
    }
  }

  try {
    if (typeof navigator === 'undefined' || !navigator.permissions) return 'unknown';
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return result.state as PermissionSnapshot;
  } catch {
    // Safari has no Permissions API entry for geolocation and throws here, so
    // 'unknown' is the normal answer on iPhone — never treat it as "no".
    return 'unknown';
  }
}

/**
 * Read the position without ever showing a prompt, or resolve null.
 *
 * This is how we detect that the user granted the permission in the settings
 * app: on Safari `checkLocationPermission()` can only answer 'unknown', so the
 * only way to know is to actually try. Callers must not treat null as a denial
 * — it only means "not available right now".
 */
export function resolveLocationSilently(timeoutMs = 4000): Promise<GeoPoint | null> {
  return checkLocationPermission().then((state) => {
    // 'prompt' would pop the browser dialog outside a user gesture, and
    // 'denied' cannot succeed — only probe when there is something to gain.
    if (state !== 'granted' && state !== 'unknown') return null;

    if (Platform.OS !== 'web') {
      return requestLocation().then((r) => (r.ok ? r.location : null));
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) return null;

    return new Promise<GeoPoint | null>((resolve) => {
      let settled = false;
      const finish = (value: GeoPoint | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      // Safari occasionally never calls either callback; keep our own deadline.
      const timer = setTimeout(() => finish(null), timeoutMs + 500);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          finish({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {
          clearTimeout(timer);
          finish(null);
        },
        { enableHighAccuracy: false, timeout: timeoutMs, maximumAge: 300000 },
      );
    });
  });
}

/**
 * Confirm the permission we already hold is still valid.
 *
 * Unlike resolveLocationSilently() this never reads from cache: a stale fix
 * would keep looking like success after the user revoked access in settings,
 * which is exactly the case we are trying to catch.
 */
export function verifyLocationAccess(): Promise<LocationRequestResult> {
  if (Platform.OS !== 'web') return requestLocationNative();

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, reason: 'unsupported', canAskAgain: false });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          ok: true,
          location: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
        }),
      (err) => {
        const reason: DenialReason =
          err.code === err.PERMISSION_DENIED
            ? 'denied'
            : err.code === err.TIMEOUT
              ? 'timeout'
              : 'unavailable';
        resolve({ ok: false, reason, canAskAgain: reason !== 'denied' });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 },
    );
  });
}

/** True when the OS/browser can be sent to the right settings page programmatically. */
export function canOpenLocationSettings(host: HostInfo = getHostInfo()): boolean {
  if (!host.isWeb) return true;
  // Chromium browsers on Android can be handed an intent:// URL.
  return (
    host.os === 'android' &&
    (host.browser === 'chrome' || host.browser === 'samsung' || host.browser === 'edge')
  );
}

/**
 * Send the user to the place where the location permission is changed.
 * Resolves `true` when the jump was actually performed.
 *
 * Native: opens this app's own settings page (iOS and Android alike).
 * Android web: fires the system location-settings intent with a fallback
 *   back to the current page, so a blocked intent cannot strand the user.
 * iOS web / desktop: impossible by design — the caller shows the guide.
 */
export async function openLocationSettings(host: HostInfo = getHostInfo()): Promise<boolean> {
  if (!host.isWeb) {
    try {
      await Linking.openSettings();
      return true;
    } catch {
      return false;
    }
  }

  if (canOpenLocationSettings(host) && typeof window !== 'undefined') {
    try {
      const fallback = encodeURIComponent(window.location.href);
      window.location.href =
        'intent://settings/#Intent;scheme=android-app;' +
        'action=android.settings.LOCATION_SOURCE_SETTINGS;' +
        `S.browser_fallback_url=${fallback};end`;
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

export interface SettingsGuide {
  title: string;
  steps: string[];
  footer: string;
}

/** Exact, per-platform Hebrew instructions for re-enabling location. */
export function getSettingsGuide(host: HostInfo = getHostInfo()): SettingsGuide {
  const retry = 'סיימת? חזור לכאן והקש "ניסיתי — בדוק שוב".';

  if (!host.isWeb) {
    return {
      title: host.os === 'ios' ? 'הפעלת מיקום ב-iPhone' : 'הפעלת מיקום באנדרואיד',
      steps:
        host.os === 'ios'
          ? [
              'פתחנו לך את מסך ההגדרות של קרוב',
              'הקש על "מיקום"',
              'בחר "בעת השימוש באפליקציה"',
            ]
          : [
              'פתחנו לך את מסך ההגדרות של קרוב',
              'הקש על "הרשאות" ואז "מיקום"',
              'בחר "אפשר רק בזמן השימוש באפליקציה"',
            ],
      footer: retry,
    };
  }

  if (host.os === 'ios' && host.standalone) {
    return {
      title: 'הפעלת מיקום ל״קרוב״',
      steps: [
        'פתח: הגדרות ← פרטיות ואבטחה ← שירותי מיקום',
        'ודא ששירותי המיקום פועלים',
        'גלול ברשימה ובחר ״קרוב״',
        'בחר ״בעת השימוש באפליקציה״',
        'חזור לקרוב',
      ],
      footer: retry,
    };
  }

  if (host.os === 'ios') {
    const appName =
      host.browser === 'chrome' ? 'Chrome' : host.browser === 'firefox' ? 'Firefox' : 'Safari';
    const steps = [
      'פתח: הגדרות ← פרטיות ואבטחה ← שירותי מיקום',
      'ודא ששירותי המיקום פועלים',
      `גלול ברשימה, בחר ${appName} ואז ״בעת השימוש באפליקציה״`,
    ];
    if (host.browser === 'safari') {
      steps.push('חזור ל-Safari והקש על ״אA״ בשורת הכתובת');
      steps.push('הגדרות עבור אתר זה ← מיקום ← ״אפשר״');
    } else {
      steps.push(`חזור ל-${appName} ← תפריט ⋮ ← הגדרות ← הגדרות אתרים ← מיקום ← ״אפשר״`);
    }
    steps.push('רענן את הדף');
    return { title: 'הפעלת מיקום ב-iPhone', steps, footer: retry };
  }

  if (host.os === 'android') {
    return {
      title: 'הפעלת מיקום באנדרואיד',
      steps: [
        'ודא שהמיקום של המכשיר דלוק: הגדרות ← מיקום',
        'בדפדפן: הקש על סמל המנעול/ההגדרות שליד כתובת האתר',
        'הרשאות ← מיקום ← ״אפשר״',
        'רענן את הדף',
      ],
      footer: retry,
    };
  }

  return {
    title: 'הפעלת מיקום בדפדפן',
    steps: [
      'לחץ על סמל המנעול שליד כתובת האתר',
      'בחר ״מיקום״ ואז ״אפשר״',
      'רענן את הדף',
    ],
    footer: retry,
  };
}

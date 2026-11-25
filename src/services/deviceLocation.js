import { PermissionsAndroid, Platform } from 'react-native';

// Keep native MapLibre modules out of Jest's non-native renderer.
const locationManager = typeof jest === 'undefined'
  ? require('@maplibre/maplibre-react-native').LocationManager
  : null;

function readCoordinates(position) {
  const latitude = Number(position?.coords?.latitude);
  const longitude = Number(position?.coords?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  const accuracy = Number(position?.coords?.accuracy);
  return {
    latitude,
    longitude,
    accuracyMeters: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
  };
}

async function requestLocationPermission() {
  if (Platform.OS === 'android') {
    const permissions = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
    ]);
    return permissions[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
      || permissions[PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
  }
  return locationManager.requestPermissions();
}

function requestCurrentPosition(timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let onLocation;
    const timeout = setTimeout(() => finish(new Error('No device location was received. Turn on Location/GPS and try again.')), timeoutMs);
    const finish = (error, position) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (onLocation) locationManager.removeListener(onLocation);
      if (error) reject(error);
      else resolve(position);
    };
    onLocation = position => finish(null, position);

    try {
      locationManager.addListener(onLocation);
      locationManager.getCurrentPosition()
        .then(position => { if (position) finish(null, position); })
        .catch(() => {});
    } catch (error) {
      finish(error instanceof Error ? error : new Error('Could not read device location.'));
    }
  });
}

/** Ask for foreground permission and resolve a one-time device position. */
export async function getDeviceLocation({ timeoutMs = 12_000 } = {}) {
  if (!locationManager) {
    throw new Error('Device location is available when running the native Android app.');
  }
  let granted = false;
  try {
    granted = await requestLocationPermission();
  } catch {
    throw new Error('Location permission could not be requested on this device.');
  }
  if (!granted) throw new Error('Location permission was denied. You can enter coordinates manually.');

  let position;
  try {
    position = await requestCurrentPosition(timeoutMs);
  } catch (error) {
    throw new Error(error?.message || 'Could not read device location. Check that Location/GPS is enabled.');
  }
  const coordinates = readCoordinates(position);
  if (!coordinates) throw new Error('Your device did not return valid coordinates. Try again or enter them manually.');
  return coordinates;
}

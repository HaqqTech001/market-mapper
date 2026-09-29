import * as Location from 'expo-location';
import type {
  LocationCoordinates,
  LocationObject,
  LocationOptions,
  LocationPermissionState,
  LocationSubscription,
} from '@/src/lib/location/locationService';

function mapPermission(status: Location.PermissionStatus, canAskAgain: boolean): LocationPermissionState {
  if (status === Location.PermissionStatus.GRANTED) return 'granted';
  if (status === Location.PermissionStatus.DENIED) return canAskAgain ? 'denied' : 'permanently_denied';
  return 'not_determined';
}

export const nativeLocationService = {
  async getForegroundPermissionsAsync() {
    const services = await Location.hasServicesEnabledAsync();
    if (!services) return { status: 'services_disabled' as const, granted: false, canAskAgain: true };
    const result = await Location.getForegroundPermissionsAsync();
    return { status: mapPermission(result.status, result.canAskAgain), granted: result.granted, canAskAgain: result.canAskAgain };
  },

  async requestForegroundPermissionsAsync() {
    const services = await Location.hasServicesEnabledAsync();
    if (!services) return { status: 'services_disabled' as const, granted: false, canAskAgain: true };
    const result = await Location.requestForegroundPermissionsAsync();
    return { status: mapPermission(result.status, result.canAskAgain), granted: result.granted, canAskAgain: result.canAskAgain };
  },

  async watchPositionAsync(
    options: LocationOptions,
    callback: (location: LocationObject) => void,
  ): Promise<LocationSubscription> {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: options.timeInterval ?? 1000,
        distanceInterval: options.distanceInterval ?? 1,
      },
      (position) => callback({
        timestamp: position.timestamp,
        coords: position.coords as LocationCoordinates,
      }),
    );
    return { remove: () => subscription.remove() };
  },
};

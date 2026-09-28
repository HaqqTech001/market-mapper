/**
 * Location Service Provider — Phase 3 Location Engine
 * Conforms to Expo Location interface with fallback to browser Geolocation
 * and Simulated GPS walking track for desktop/Vite preview testing.
 */

export type LocationPermissionState =
  | 'not_determined'
  | 'granted'
  | 'denied'
  | 'permanently_denied'
  | 'services_disabled';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy: number;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface LocationObject {
  coords: LocationCoordinates;
  timestamp: number;
}

export interface LocationSubscription {
  remove: () => void;
}

export interface LocationOptions {
  accuracy?: number; // 1 to 6 (High / BestForNavigation)
  timeInterval?: number; // Minimum interval between updates in ms
  distanceInterval?: number; // Minimum displacement in meters
}

class LocationService {
  private permissionState: LocationPermissionState = 'not_determined';
  private simulatedInterval: any = null;
  private simulatedHeading = 45;
  private simulatedLat = 6.4698;
  private simulatedLng = 3.1925;
  private isSimulationEnabled = false;

  constructor() {
    this.checkInitialState();
  }

  private async checkInitialState() {
    if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
      try {
        const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (status.state === 'granted') {
          this.permissionState = 'granted';
        } else if (status.state === 'denied') {
          this.permissionState = 'denied';
        } else {
          this.permissionState = 'not_determined';
        }
      } catch {
        this.permissionState = 'not_determined';
      }
    }
  }

  /**
   * Returns current foreground permission status
   */
  async getForegroundPermissionsAsync(): Promise<{
    status: LocationPermissionState;
    granted: boolean;
    canAskAgain: boolean;
  }> {
    return {
      status: this.permissionState,
      granted: this.permissionState === 'granted',
      canAskAgain: this.permissionState !== 'permanently_denied',
    };
  }

  /**
   * Requests foreground location permission contextually
   */
  async requestForegroundPermissionsAsync(): Promise<{
    status: LocationPermissionState;
    granted: boolean;
    canAskAgain: boolean;
  }> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.permissionState = 'services_disabled';
      return { status: 'services_disabled', granted: false, canAskAgain: false };
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          this.permissionState = 'granted';
          resolve({ status: 'granted', granted: true, canAskAgain: true });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            this.permissionState = 'denied';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            this.permissionState = 'services_disabled';
          } else {
            this.permissionState = 'denied';
          }
          resolve({ status: this.permissionState, granted: false, canAskAgain: true });
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });
  }

  /**
   * Request background permissions:
   * Note: Background location tracking in React Native/Expo requires physical device testing.
   */
  async requestBackgroundPermissionsAsync(): Promise<{
    status: LocationPermissionState;
    granted: boolean;
    canAskAgain: boolean;
    note: string;
  }> {
    return {
      status: 'denied',
      granted: false,
      canAskAgain: true,
      note: 'BACKGROUND-TRACKING REQUIRES PHYSICAL-DEVICE VALIDATION. Android requires ACCESS_BACKGROUND_LOCATION.',
    };
  }

  /**
   * Subscribes to continuous position updates
   */
  async watchPositionAsync(
    options: LocationOptions,
    callback: (location: LocationObject) => void
  ): Promise<LocationSubscription> {
    if (this.isSimulationEnabled) {
      return this.startSimulatedWatch(options, callback);
    }

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          callback({
            coords: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              altitude: pos.coords.altitude,
              altitudeAccuracy: pos.coords.altitudeAccuracy,
              heading: pos.coords.heading,
              speed: pos.coords.speed,
            },
            timestamp: pos.timestamp,
          });
        },
        (err) => {
          console.warn('Geolocation watch error:', err.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 1000,
          timeout: 10000,
        }
      );

      return {
        remove: () => {
          navigator.geolocation.clearWatch(watchId);
        },
      };
    }

    // Fallback: emit initial coordinate if geolocation is unavailable
    const timer = setTimeout(() => {
      callback({
        coords: {
          latitude: this.simulatedLat,
          longitude: this.simulatedLng,
          accuracy: 5,
          heading: 90,
          speed: 1.2,
        },
        timestamp: Date.now(),
      });
    }, 500);

    return {
      remove: () => clearTimeout(timer),
    };
  }

  /**
   * Enables simulated walking mode for rapid testing of corridors, turns, and GPS anomalies
   */
  setSimulationMode(enabled: boolean) {
    this.isSimulationEnabled = enabled;
  }

  getIsSimulationMode(): boolean {
    return this.isSimulationEnabled;
  }

  private startSimulatedWatch(
    options: LocationOptions,
    callback: (location: LocationObject) => void
  ): LocationSubscription {
    const intervalMs = options.timeInterval || 1000;

    this.simulatedInterval = setInterval(() => {
      // Step ~1.2 meters in current heading with slight natural wander
      this.simulatedHeading += (Math.random() - 0.5) * 10;
      const stepMeters = 1.1 + Math.random() * 0.3; // Walking speed: ~1.2 m/s

      const rad = (this.simulatedHeading * Math.PI) / 180;
      const dLat = (stepMeters * Math.cos(rad)) / 111111;
      const dLng = (stepMeters * Math.sin(rad)) / (111111 * Math.cos((this.simulatedLat * Math.PI) / 180));

      this.simulatedLat += dLat;
      this.simulatedLng += dLng;

      // Realistic field accuracy jitter (4m to 9m)
      const accuracy = 4.5 + Math.random() * 4.5;

      callback({
        coords: {
          latitude: this.simulatedLat,
          longitude: this.simulatedLng,
          accuracy: Number(accuracy.toFixed(1)),
          heading: Math.round(this.simulatedHeading) % 360,
          speed: 1.2,
          altitude: 12.5,
          altitudeAccuracy: 3.0,
        },
        timestamp: Date.now(),
      });
    }, intervalMs);

    return {
      remove: () => {
        if (this.simulatedInterval) {
          clearInterval(this.simulatedInterval);
          this.simulatedInterval = null;
        }
      },
    };
  }

  /**
   * Helper to manually inject GPS coordinate for diagnostics/tests
   */
  setCoordinates(lat: number, lng: number) {
    this.simulatedLat = lat;
    this.simulatedLng = lng;
  }
}

export const locationService = new LocationService();

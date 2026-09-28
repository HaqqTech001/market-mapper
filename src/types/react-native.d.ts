declare module 'react-native' {
  export const Platform: {
    OS: 'ios' | 'android' | 'windows' | 'macos' | 'web';
    select: <T>(specifics: { [platform in 'ios' | 'android' | 'windows' | 'macos' | 'web' | 'default']?: T }) => T;
  };
  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
    absoluteFillObject: Record<string, any>;
    absoluteFill: Record<string, any>;
  };
  export const View: any;
  export const Text: any;
  export const TouchableOpacity: any;
}

declare module 'react-native-maps' {
  export const PROVIDER_GOOGLE: string;
  export const PROVIDER_DEFAULT: string;

  export interface Region {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }

  export interface LatLng {
    latitude: number;
    longitude: number;
  }

  export class MapView extends React.Component<any, any> {
    animateToRegion(region: Region, duration?: number): void;
    fitToCoordinates(coordinates: LatLng[], options?: any): void;
  }

  export const Marker: React.ComponentType<any>;
  export const Polyline: React.ComponentType<any>;
  export const Polygon: React.ComponentType<any>;
  export const Circle: React.ComponentType<any>;

  export default MapView;
}

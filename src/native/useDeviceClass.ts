import { useWindowDimensions } from 'react-native';

export type DeviceClass = 'phone' | 'tablet';

export function useDeviceClass(): DeviceClass {
  const { width } = useWindowDimensions();
  return width >= 720 ? 'tablet' : 'phone';
}

export function useSplitLayout(): boolean {
  const { width } = useWindowDimensions();
  return width >= 960;
}

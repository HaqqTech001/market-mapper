import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';
import { StyleSheet, View } from 'react-native';

type Props = {
  currentLocation: LatLng | null;
  path: LatLng[];
  startingPoint?: LatLng | null;
};

export function NativeFieldMap({ currentLocation, path, startingPoint }: Props) {
  const initial = currentLocation ?? startingPoint ?? { latitude: 6.5244, longitude: 3.3792 };

  return (
    <View style={styles.container}>
      <MapView
        style={StyleSheet.absoluteFill}
        provider={PROVIDER_GOOGLE}
        initialRegion={{ ...initial, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
        showsUserLocation
        showsMyLocationButton
        rotateEnabled
        pitchEnabled={false}
      >
        {startingPoint ? <Marker coordinate={startingPoint} title="Mission starting point" /> : null}
        {path.length > 1 ? <Polyline coordinates={path} strokeWidth={5} /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, minHeight: 320 } });

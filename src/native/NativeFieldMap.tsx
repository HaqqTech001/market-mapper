import MapView,{Marker,Polyline,PROVIDER_GOOGLE,type LatLng,type MapType} from 'react-native-maps';
import {StyleSheet,View} from 'react-native';
import {forwardRef} from 'react';
export type NativeFieldMapHandle=MapView;
type Props={currentLocation:LatLng|null;path:LatLng[];startingPoint?:LatLng|null;mapType?:MapType};
export const NativeFieldMap=forwardRef<MapView,Props>(function NativeFieldMap({currentLocation,path,startingPoint,mapType='standard'},ref){
 const initial=currentLocation??startingPoint??{latitude:6.5244,longitude:3.3792};
 return <View style={s.container}><MapView ref={ref} style={StyleSheet.absoluteFill} provider={PROVIDER_GOOGLE} mapType={mapType} initialRegion={{...initial,latitudeDelta:.004,longitudeDelta:.004}} showsUserLocation showsMyLocationButton={false} showsCompass showsScale toolbarEnabled={false} rotateEnabled pitchEnabled={false} loadingEnabled loadingBackgroundColor="#F7FAF8">
 {startingPoint?<Marker coordinate={startingPoint} title="Mission starting point"/>:null}{path.length>1?<Polyline coordinates={path} strokeWidth={5} strokeColor="#047857"/>:null}
 </MapView></View>
});
const s=StyleSheet.create({container:{flex:1,minHeight:320,backgroundColor:'#EAF2EC'}});

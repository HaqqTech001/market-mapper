import MapView,{Marker,Polyline,PROVIDER_GOOGLE,type LatLng,type MapType} from 'react-native-maps';
import {StyleSheet,View} from 'react-native';
import {forwardRef} from 'react';
export type NativeFieldMapHandle=MapView;
type Props={currentLocation:LatLng|null;path:LatLng[];startingPoint?:LatLng|null;mapType?:MapType;mappingMode?:boolean};

const FIELD_STYLE=[
 {featureType:'poi',elementType:'labels',stylers:[{visibility:'off'}]},
 {featureType:'transit',elementType:'labels',stylers:[{visibility:'off'}]},
 {featureType:'road',elementType:'geometry',stylers:[{visibility:'on'},{saturation:-45},{lightness:18}]},
 {featureType:'road',elementType:'labels',stylers:[{visibility:'on'}]},
 {featureType:'road.local',elementType:'labels',stylers:[{visibility:'on'}]},
 {featureType:'landscape',elementType:'geometry',stylers:[{color:'#F7FAF8'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#CFE8F6'}]},
];

export const NativeFieldMap=forwardRef<MapView,Props>(function NativeFieldMap({currentLocation,path,startingPoint,mapType='standard',mappingMode=false},ref){
 const initial=currentLocation??startingPoint??{latitude:6.5244,longitude:3.3792};
 return <View style={s.container}><MapView
  ref={ref}
  style={StyleSheet.absoluteFill}
  provider={PROVIDER_GOOGLE}
  mapType={mapType}
  customMapStyle={mapType==='standard'&&mappingMode?FIELD_STYLE:undefined}
  userInterfaceStyle="light"
  initialRegion={{...initial,latitudeDelta:.0025,longitudeDelta:.0025}}
  showsUserLocation
  userLocationPriority="high"
  userLocationUpdateInterval={1000}
  userLocationFastestInterval={500}
  showsMyLocationButton={false}
  showsCompass
  showsScale
  showsBuildings
  showsPointsOfInterest={!mappingMode}
  toolbarEnabled={false}
  rotateEnabled={false}
  pitchEnabled={false}
  zoomEnabled
  scrollEnabled
  minZoomLevel={15}
  maxZoomLevel={21}
  loadingEnabled
  loadingBackgroundColor="#F7FAF8">
 {startingPoint?<Marker coordinate={startingPoint} title="Mission starting point"/>:null}
 {path.length>1?<><Polyline coordinates={path} strokeWidth={10} strokeColor="rgba(255,255,255,0.96)"/><Polyline coordinates={path} strokeWidth={6} strokeColor="#047857"/></>:null}
 </MapView></View>
});
const s=StyleSheet.create({container:{flex:1,minHeight:320,backgroundColor:'#EAF2EC'}});

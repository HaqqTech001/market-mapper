import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView,{Marker,Polyline} from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

type Point={latitude:number;longitude:number};
function distanceMeters(a:Point,b:Point){
 const R=6371000,toRad=(v:number)=>v*Math.PI/180;
 const dLat=toRad(b.latitude-a.latitude),dLon=toRad(b.longitude-a.longitude);
 const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.sin(dLon/2)**2;
 return 2*R*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function bearing(a:Point,b:Point){
 const toRad=(v:number)=>v*Math.PI/180,toDeg=(v:number)=>v*180/Math.PI;
 const y=Math.sin(toRad(b.longitude-a.longitude))*Math.cos(toRad(b.latitude));
 const x=Math.cos(toRad(a.latitude))*Math.sin(toRad(b.latitude))-Math.sin(toRad(a.latitude))*Math.cos(toRad(b.latitude))*Math.cos(toRad(b.longitude-a.longitude));
 return (toDeg(Math.atan2(y,x))+360)%360;
}
const direction=(d:number)=>['N','NE','E','SE','S','SW','W','NW'][Math.round(d/45)%8];

export function SharedLocationViewer({location,onClose}:{location:{latitude:number;longitude:number;label:string}|null;onClose:()=>void}){
 const [me,setMe]=useState<Point|null>(null);const [locating,setLocating]=useState(false);const [navigating,setNavigating]=useState(false);const mapRef=useRef<MapView|null>(null);
 useEffect(()=>{if(!location)return;let alive=true;let sub:Location.LocationSubscription|undefined;(async()=>{try{setLocating(true);const p=await Location.requestForegroundPermissionsAsync();if(p.status!=='granted')return;const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.BestForNavigation});if(alive)setMe({latitude:pos.coords.latitude,longitude:pos.coords.longitude});sub=await Location.watchPositionAsync({accuracy:Location.Accuracy.BestForNavigation,timeInterval:1000,distanceInterval:1},pos=>{if(!alive)return;const next={latitude:pos.coords.latitude,longitude:pos.coords.longitude};setMe(next);if(navigating)mapRef.current?.animateCamera({center:next,zoom:18,heading:pos.coords.heading&&pos.coords.heading>0?pos.coords.heading:0,pitch:45},{duration:450});});}catch{}finally{if(alive)setLocating(false)}})();return()=>{alive=false;sub?.remove()}},[location?.latitude,location?.longitude,navigating]);
 const stats=useMemo(()=>location&&me?{distance:distanceMeters(me,location),bearing:bearing(me,location)}:null,[me,location]);
 if(!location)return null;
 const points=me?[me,location]:[location];
 const lats=points.map(p=>p.latitude),lngs=points.map(p=>p.longitude);
 const region={latitude:(Math.min(...lats)+Math.max(...lats))/2,longitude:(Math.min(...lngs)+Math.max(...lngs))/2,latitudeDelta:Math.max(.004,(Math.max(...lats)-Math.min(...lats))*1.7),longitudeDelta:Math.max(.004,(Math.max(...lngs)-Math.min(...lngs))*1.7)};
 const navigate=()=>{setNavigating(true);if(me)mapRef.current?.fitToCoordinates([me,location],{edgePadding:{top:90,right:60,bottom:230,left:60},animated:true})};
 return <Modal visible animationType="slide" onRequestClose={onClose}><View style={s.page}><View style={s.header}><Pressable style={s.close} onPress={onClose}><Ionicons name="arrow-back" size={24} color="#111827"/></Pressable><View><Text style={s.title}>{location.label||'Shared location'}</Text><Text style={s.sub}>Meet-up location</Text></View></View><MapView ref={mapRef} style={s.map} initialRegion={region} userInterfaceStyle="light" toolbarEnabled={false} showsUserLocation><Marker coordinate={location} title={location.label||'Shared location'}/>{me?<><Marker coordinate={me} title="You" pinColor="#2563EB"/><Polyline coordinates={[me,location]} strokeWidth={4}/></>:null}</MapView><View style={s.card}><View style={s.row}><Ionicons name="navigate-circle" size={28} color="#047857"/><View style={{flex:1}}><Text style={s.cardTitle}>{stats?`${stats.distance<1000?Math.round(stats.distance)+' m':(stats.distance/1000).toFixed(1)+' km'} away · ${direction(stats.bearing)}`:locating?'Finding your location…':'Your location is unavailable'}</Text><Text style={s.coords}>{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</Text></View></View><Text style={s.note}>{navigating?'Navigation is running inside Market Mapper. Your position and direction update as you walk toward the shared location.':'Distance is straight-line distance to the shared point. Start navigation to follow it without leaving Market Mapper.'}</Text><Pressable style={s.navigate} onPress={navigate}><Ionicons name={navigating?'navigate':'walk-outline'} size={20} color="#FFF"/><Text style={s.navigateText}>{navigating?'Navigating in Market Mapper':'Navigate in Market Mapper'}</Text></Pressable>{navigating?<Pressable style={s.stop} onPress={()=>setNavigating(false)}><Text style={s.stopText}>Stop navigation</Text></Pressable>:null}</View></View></Modal>
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F8FAFC'},header:{height:92,paddingTop:34,paddingHorizontal:8,flexDirection:'row',alignItems:'center',backgroundColor:'#FFF',borderBottomWidth:1,borderColor:'#E2E8F0'},close:{width:48,height:48,alignItems:'center',justifyContent:'center'},title:{fontSize:17,fontWeight:'900',color:'#111827'},sub:{fontSize:12,color:'#64748B',marginTop:2},map:{flex:1},card:{position:'absolute',left:16,right:16,bottom:22,padding:14,borderRadius:16,backgroundColor:'#FFF',gap:10,elevation:5,shadowOpacity:.14,shadowRadius:12},row:{flexDirection:'row',alignItems:'center',gap:10},cardTitle:{fontWeight:'900',color:'#111827'},coords:{fontSize:12,color:'#64748B',marginTop:3},note:{fontSize:11,color:'#64748B',lineHeight:16},navigate:{minHeight:48,borderRadius:12,backgroundColor:'#047857',flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center'},navigateText:{color:'#FFF',fontWeight:'900'},stop:{minHeight:42,borderRadius:11,borderWidth:1,borderColor:'#CBD5E1',alignItems:'center',justifyContent:'center',backgroundColor:'#FFF'},stopText:{color:'#334155',fontWeight:'900'}});

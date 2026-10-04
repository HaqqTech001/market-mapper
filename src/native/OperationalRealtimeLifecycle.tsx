import { useEffect } from 'react';
import { ChatRepository } from '@/src/db/repositories/ChatRepository';
import { nativeSupabase } from './supabase';
import { getAssignedNativeMissions, requireNativeUserContext } from './userContext';
import { startOperationalRealtime, stopOperationalRealtime } from './operationalRealtime';
import { hydrateOperationalMessaging } from './operationalHydration';
import { initializeOperationalNotifications, installOperationalNotificationNavigation } from './notificationDelivery';

export function OperationalRealtimeLifecycle(){
 useEffect(()=>{
  let alive=true;
  let generation=0;
  const removeNotificationNavigation=installOperationalNotificationNavigation();
  initializeOperationalNotifications().catch(error=>console.warn('Notification initialization unavailable',error));
  const start=async()=>{
   const mine=++generation;
   await stopOperationalRealtime();
   try{
    const user=await requireNativeUserContext();
    if(!alive||mine!==generation)return;
    const missions=await getAssignedNativeMissions(user.userId);
    for(const mission of missions) await ChatRepository.getOrCreateChannel(mission.title+' Comms','mission',undefined,mission.id);
    await hydrateOperationalMessaging(user.userId,missions.map(m=>m.id)).catch(error=>console.warn('Operational hydration unavailable; using local cache',error));
    if(!alive||mine!==generation)return;
    await startOperationalRealtime(user.userId,missions.map(m=>m.id));
   }catch(error){
    if(String(error).includes('AUTH_REQUIRED')) return;
    console.warn('Operational realtime unavailable',error);
   }
  };
  start();
  const {data}=nativeSupabase.auth.onAuthStateChange(()=>{start()});
  return()=>{alive=false;generation++;removeNotificationNavigation();data.subscription.unsubscribe();stopOperationalRealtime().catch(()=>{})};
 },[]);
 return null;
}

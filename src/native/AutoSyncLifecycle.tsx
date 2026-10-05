import { useEffect } from 'react';
import { AppState } from 'react-native';
import { retryNativeSync } from './syncCoordinator';

export function AutoSyncLifecycle(){
 useEffect(()=>{
  let alive=true;let timer:ReturnType<typeof setInterval>|undefined;
  const sync=()=>{if(alive)retryNativeSync().catch(error=>console.warn('Automatic sync unavailable',error))};
  sync();
  timer=setInterval(sync,30000);
  const sub=AppState.addEventListener('change',state=>{if(state==='active')sync()});
  return()=>{alive=false;if(timer)clearInterval(timer);sub.remove()};
 },[]);
 return null;
}
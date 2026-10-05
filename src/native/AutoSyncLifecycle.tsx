import { useEffect } from 'react';
import { AppState } from 'react-native';
import { runNativeSync, retryNativeSync } from './syncCoordinator';

export function AutoSyncLifecycle(){
 useEffect(()=>{
  let alive=true;let timer:ReturnType<typeof setInterval>|undefined;
  const sync=(retryFailed=false)=>{if(!alive)return;(retryFailed?retryNativeSync():runNativeSync()).catch(error=>console.warn('Automatic sync unavailable',error))};
  sync(true);
  timer=setInterval(()=>sync(false),5000);
  const sub=AppState.addEventListener('change',state=>{if(state==='active')sync(true)});
  return()=>{alive=false;if(timer)clearInterval(timer);sub.remove()};
 },[]);
 return null;
}
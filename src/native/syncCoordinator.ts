import { OutboxRepository } from '@/src/db/repositories/OutboxRepository';
import { MediaUploadRepository } from '@/src/db/repositories/MediaUploadRepository';
import { syncPendingOutbox } from './syncEngine';
import { uploadPendingMedia } from './mediaSync';

export type NativeSyncState = 'saved' | 'pending' | 'syncing' | 'synced' | 'failed';
export type NativeSyncSnapshot = { state:NativeSyncState; relationalPending:number; mediaPending:number; lastSyncedAt?:string; lastError?:string };

let running: Promise<NativeSyncSnapshot> | null = null;

export async function getNativeSyncSnapshot():Promise<NativeSyncSnapshot>{
 const [relationalPending,mediaPending]=await Promise.all([OutboxRepository.countPending(),MediaUploadRepository.countPending()]);
 return {state: relationalPending+mediaPending>0?'pending':'synced',relationalPending,mediaPending};
}

export async function runNativeSync():Promise<NativeSyncSnapshot>{
 if(running)return running;
 running=(async()=>{
  try{
   const relational=await syncPendingOutbox(50);
   const media=await uploadPendingMedia(10);
   const [relationalPending,mediaPending]=await Promise.all([OutboxRepository.countPending(),MediaUploadRepository.countPending()]);
   const failed=relational.failed+media.failed>0;
   return {state:failed?'failed':relationalPending+mediaPending>0?'pending':'synced',relationalPending,mediaPending,lastSyncedAt:failed?undefined:new Date().toISOString(),lastError:failed?'Some saved field work could not sync. It remains on this device for retry.':undefined};
  }catch(error){
   const [relationalPending,mediaPending]=await Promise.all([OutboxRepository.countPending(),MediaUploadRepository.countPending()]);
   return {state:'failed',relationalPending,mediaPending,lastError:error instanceof Error?error.message:String(error)};
  }finally{running=null}
 })();
 return running;
}

export async function retryNativeSync(){
 await Promise.all([OutboxRepository.retryFailed(),MediaUploadRepository.retryFailed()]);
 return runNativeSync();
}

import * as tus from 'tus-js-client';
import { nativeSupabase } from './supabase';
import { CHAT_MAX_ATTACHMENT_BYTES } from './chatUX';

type State={status:'uploading'|'paused'|'complete'|'failed'|'cancelled';progress:number;error?:string};
type Listener=(s:State)=>void;
const active=new Map<string,tus.Upload>();
const listeners=new Map<string,Set<Listener>>();
const emit=(id:string,s:State)=>{for(const fn of listeners.get(id)||[])fn(s)};
export function subscribeChatUpload(id:string,fn:Listener){const set=listeners.get(id)||new Set<Listener>();set.add(fn);listeners.set(id,set);return()=>{set.delete(fn);if(!set.size)listeners.delete(id)}}
export function cancelChatUpload(id:string){const u=active.get(id);if(u){u.abort(true).catch(()=>{});active.delete(id)}emit(id,{status:'cancelled',progress:0})}
export async function resumableChatUpload(input:{jobId:string;file:any;bucket:string;remotePath:string;contentType:string;size:number}):Promise<void>{
 if(input.size>CHAT_MAX_ATTACHMENT_BYTES)throw new Error('CHAT_MEDIA_TOO_LARGE');
 const {data:{session}}=await nativeSupabase.auth.getSession();if(!session?.access_token)throw new Error('AUTH_SESSION_REQUIRED');
 const base=process.env.EXPO_PUBLIC_SUPABASE_URL;if(!base)throw new Error('SUPABASE_URL_REQUIRED');
 const host=new URL(base).hostname;const projectRef=host.split('.')[0];const endpoint='https://'+projectRef+'.storage.supabase.co/storage/v1/upload/resumable';
 await new Promise<void>((resolve,reject)=>{
  const upload=new tus.Upload(input.file,{endpoint,retryDelays:[0,3000,5000,10000,20000],chunkSize:6*1024*1024,uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,headers:{authorization:'Bearer '+session.access_token,'x-upsert':'true'},metadata:{bucketName:input.bucket,objectName:input.remotePath,contentType:input.contentType,cacheControl:'3600'},onProgress:(sent,total)=>emit(input.jobId,{status:'uploading',progress:total?sent/total:0}),onError:e=>{active.delete(input.jobId);emit(input.jobId,{status:'failed',progress:0,error:e.message});reject(e)},onSuccess:()=>{active.delete(input.jobId);emit(input.jobId,{status:'complete',progress:1});resolve()}});
  active.set(input.jobId,upload);upload.findPreviousUploads().then(previous=>{if(previous.length)upload.resumeFromPreviousUpload(previous[0]);upload.start()}).catch(reject);
 });
}

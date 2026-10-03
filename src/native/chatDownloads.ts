import * as FileSystem from 'expo-file-system/legacy';
import { nativeSupabase } from './supabase';
import { getDatabase } from '@/src/db/sqlite';

type State={status:'idle'|'downloading'|'complete'|'failed'|'cancelled';progress:number;localUri?:string;error?:string};
type Listener=(state:State)=>void;
const jobs=new Map<string,FileSystem.DownloadResumable>();
const listeners=new Map<string,Set<Listener>>();

function emit(id:string,state:State){for(const fn of listeners.get(id)||[])fn(state)}
export function subscribeChatDownload(messageId:string,fn:Listener){const set=listeners.get(messageId)||new Set<Listener>();set.add(fn);listeners.set(messageId,set);return()=>{set.delete(fn);if(!set.size)listeners.delete(messageId)}}
export async function cancelChatDownload(messageId:string){const job=jobs.get(messageId);if(job){await job.pauseAsync().catch(()=>{});jobs.delete(messageId)}emit(messageId,{status:'cancelled',progress:0})}

export async function downloadChatAttachment(input:{messageId:string;remotePath:string;name:string}):Promise<string>{
 const db=getDatabase();
 const row=await db.getFirstAsync<any>('SELECT attachment_json FROM local_chat_messages WHERE id=?;',[input.messageId]);
 let attachment:any={};try{attachment=row?.attachment_json?JSON.parse(row.attachment_json):{}}catch{}
 if(attachment.localUri){const info=await FileSystem.getInfoAsync(attachment.localUri);if(info.exists)return attachment.localUri}
 const {data,error}=await nativeSupabase.storage.from('field-media').createSignedUrl(input.remotePath,900);if(error)throw error;
 const base=FileSystem.documentDirectory+'market-mapper/chat-downloads/';await FileSystem.makeDirectoryAsync(base,{intermediates:true});
 const ext=(input.name.split('.').pop()||'bin').replace(/[^a-z0-9]/gi,'').toLowerCase()||'bin';
 const target=base+input.messageId+'.'+ext;
 const job=FileSystem.createDownloadResumable(data.signedUrl,target,{},p=>{const progress=p.totalBytesExpectedToWrite?Math.min(1,p.totalBytesWritten/p.totalBytesExpectedToWrite):0;emit(input.messageId,{status:'downloading',progress})});
 jobs.set(input.messageId,job);emit(input.messageId,{status:'downloading',progress:0});
 try{const result=await job.downloadAsync();if(!result?.uri)throw new Error('DOWNLOAD_INCOMPLETE');attachment.localUri=result.uri;await db.runAsync('UPDATE local_chat_messages SET attachment_json=?,transfer_status=?,transfer_progress=1 WHERE id=?;',[JSON.stringify(attachment),'complete',input.messageId]);jobs.delete(input.messageId);emit(input.messageId,{status:'complete',progress:1,localUri:result.uri});return result.uri}
 catch(e){jobs.delete(input.messageId);await db.runAsync('UPDATE local_chat_messages SET transfer_status=?,transfer_progress=0 WHERE id=?;',['failed',input.messageId]);emit(input.messageId,{status:'failed',progress:0,error:e instanceof Error?e.message:String(e)});throw e}
}

import { nativeSupabase } from './supabase';
import type { NativeUserContext } from './userContext';
import { requireNativeUserContext } from './userContext';

async function requireAdmin():Promise<NativeUserContext>{const u=await requireNativeUserContext();if(u.role!=='admin')throw new Error('ADMIN_REQUIRED');return u}
export type AdminUser={id:string;fullName:string;email:string;role:'mapper'|'team_lead'|'admin';isActive:boolean};
export async function listAdminUsers():Promise<AdminUser[]>{await requireAdmin();const {data,error}=await nativeSupabase.from('profiles').select('id,full_name,email,role,is_active').order('full_name');if(error)throw error;return (data||[]).map((x:any)=>({id:x.id,fullName:x.full_name,email:x.email,role:x.role,isActive:x.is_active}))}
export async function updateAdminUserRole(id:string,role:AdminUser['role']){await requireAdmin();const {data,error}=await nativeSupabase.rpc('admin_update_user_role',{target_user_id:id,new_role:role});if(error)throw error;return data}
export async function setAdminUserActive(id:string,active:boolean){await requireAdmin();const {data,error}=await nativeSupabase.rpc('admin_set_user_active_status',{target_user_id:id,new_active_status:active});if(error)throw error;return data}
export async function adminCounts(){await requireAdmin();const [u,t,m]=await Promise.all([nativeSupabase.from('profiles').select('id',{count:'exact',head:true}),nativeSupabase.from('teams').select('id',{count:'exact',head:true}),nativeSupabase.from('missions').select('id',{count:'exact',head:true})]);return {users:u.count||0,teams:t.count||0,missions:m.count||0}}

export type AdminMissionSummary={id:string;title:string;marketId:string;marketName?:string;description?:string|null;status:string;createdAt:string;memberCount:number;areaCount:number};
export async function listAdminMissions():Promise<AdminMissionSummary[]>{
 await requireAdmin();
 const {data,error}=await nativeSupabase.from('missions').select('id,title,market_id,market_name,description,status,created_at,mission_members(count),mission_area_assignments(count)').order('created_at',{ascending:false});
 if(error)throw error;
 return (data||[]).map((x:any)=>({id:x.id,title:x.title,marketId:x.market_id,marketName:x.market_name||undefined,description:x.description,status:x.status,createdAt:x.created_at,memberCount:Number(x.mission_members?.[0]?.count||0),areaCount:Number(x.mission_area_assignments?.[0]?.count||0)}));
}

export async function createAdminMission(input:{title:string;marketName:string;description?:string;type?:string}){
 const admin=await requireAdmin();
 const now=new Date().toISOString();
 const title=input.title.trim();
 const marketName=input.marketName.trim();
 if(!title||!marketName)throw new Error('Mission title and market are required.');

 const marketId=globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-'+Date.now().toString().padStart(12,'0').slice(-12);
 const modernPayload:Record<string,unknown>={
  title,
  market_id:marketId,
  market_name:marketName,
  description:input.description?.trim()||null,
  instructions:input.description?.trim()||null,
  mission_type:input.type||'initial_mapping',
  status:'draft',
  created_by:admin.userId,
  created_at:now,
  updated_at:now
 };

 let payload={...modernPayload};
 // A number of installations still have the original Phase-2 missions table.
 // PGRST204 tells us exactly which newer column is absent. Remove only that
 // unsupported column and retry, so mission creation works across both schema
 // generations while retaining every field the deployed database supports.
 for(let attempt=0;attempt<8;attempt++){
  const {data,error}=await nativeSupabase.from('missions').insert(payload).select('id').single();
  if(!error)return data;

  const missing=error.code==='PGRST204'
   ? error.message.match(/Could not find the '([^']+)' column/)?.[1]
   : undefined;
  if(missing && Object.prototype.hasOwnProperty.call(payload,missing)){
   console.warn('Mission schema compatibility: retrying without unavailable column',missing);
   delete payload[missing];
   continue;
  }

  console.error('Mission creation failed',{code:error.code,message:error.message,details:error.details,hint:error.hint});
  throw new Error(error.message||'Mission could not be created.');
 }
 throw new Error('Mission could not be created because the deployed missions schema is incompatible with the app.');
}

export async function getAdminMission(id:string){
 await requireAdmin();

 // Load the Phase-2 core first. Optional/newer mission columns must not make
 // the entire detail screen unavailable on installations awaiting migrations.
 const {data:mission,error:missionError}=await nativeSupabase
  .from('missions')
  .select('id,title,description,status,created_at')
  .eq('id',id)
  .single();
 if(missionError)throw missionError;

 const [membersResult,areasResult]=await Promise.all([
  nativeSupabase.from('mission_members')
   .select('user_id,role,profiles!mission_members_user_id_fkey(full_name,email)')
   .eq('mission_id',id),
  nativeSupabase.from('mission_area_assignments')
   .select('id,user_id,boundary_geojson')
   .eq('mission_id',id)
 ]);

 if(membersResult.error)throw membersResult.error;
 if(areasResult.error)throw areasResult.error;

 // Normalize old Phase-2 area rows to the shape expected by the native UI.
 const areas=(areasResult.data||[]).map((a:any)=>({
  ...a,
  area_id:a.area_id||String(a.id),
  area_name:a.area_name||'Assigned area',
  assigned_to_user_id:a.assigned_to_user_id||a.user_id,
  status:a.status||'assigned',
  notes:a.notes||null
 }));

 return {
  ...mission,
  mission_members:membersResult.data||[],
  mission_area_assignments:areas
 };
}
export async function addAdminMissionMember(missionId:string,userId:string,role:'mapper'|'team_lead'='mapper'){
 await requireAdmin();
 const {error}=await nativeSupabase.from('mission_members').upsert({mission_id:missionId,user_id:userId,role},{onConflict:'mission_id,user_id'});if(error)throw error;
 const {data:mission}=await nativeSupabase.from('missions').select('title').eq('id',missionId).maybeSingle();
 // Explicit producer: do not depend on an optional historical DB trigger.
 const notificationId='mission_assign_'+missionId+'_'+userId+'_'+Date.now();
 const {error:notificationError}=await nativeSupabase.from('notifications').upsert({
   id:notificationId,recipient_id:userId,type:'mission_assignment',title:'New mission assignment',
   body:'You were added to '+(mission?.title||'a mapping mission')+'.',
   entity_reference_type:'mission',entity_reference_id:missionId,is_read:false,created_at:new Date().toISOString()
 },{onConflict:'id'});
 if(notificationError)console.warn('Mission assignment saved but notification could not be created',notificationError);
}
export async function removeAdminMissionMember(missionId:string,userId:string){
 await requireAdmin();
 const {data:mission}=await nativeSupabase.from('missions').select('title').eq('id',missionId).maybeSingle();
 // Notify while the membership still exists, then remove access.
 const notificationId='mission_remove_'+missionId+'_'+userId+'_'+Date.now();
 const {error:notificationError}=await nativeSupabase.from('notifications').insert({
   id:notificationId,recipient_id:userId,type:'mission_assignment_removed',title:'Mission assignment removed',
   body:'You were removed from '+(mission?.title||'a mapping mission')+'.',
   entity_reference_type:'mission',entity_reference_id:missionId,is_read:false,created_at:new Date().toISOString()
 });
 if(notificationError)console.warn('Mission removal notification could not be created',notificationError);
 const {error}=await nativeSupabase.from('mission_members').delete().eq('mission_id',missionId).eq('user_id',userId);if(error)throw error;
}
export async function addAdminMissionArea(input:{missionId:string;areaName:string;userId:string;notes?:string}){await requireAdmin();const id='area_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);const {error}=await nativeSupabase.from('mission_area_assignments').insert({mission_id:input.missionId,user_id:input.userId,assigned_to_user_id:input.userId,area_id:id,area_name:input.areaName.trim(),notes:input.notes?.trim()||null,status:'assigned'});if(error)throw error}
export async function updateAdminMissionStart(missionId:string,latitude:number,longitude:number){await requireAdmin();const {error}=await nativeSupabase.from('missions').update({assigned_starting_lat:latitude,assigned_starting_lng:longitude,updated_at:new Date().toISOString()}).eq('id',missionId);if(error)throw error}
export async function setAdminMissionStatus(missionId:string,status:'draft'|'active'|'paused'|'completed'|'cancelled'|'archived'){await requireAdmin();const {error}=await nativeSupabase.from('missions').update({status,updated_at:new Date().toISOString()}).eq('id',missionId);if(error)throw error}

export async function updateAdminMission(missionId:string,input:{title?:string;description?:string;status?:'draft'|'active'|'paused'|'completed'|'cancelled'|'archived'}){
 await requireAdmin();const payload:Record<string,unknown>={updated_at:new Date().toISOString()};
 if(input.title!==undefined)payload.title=input.title.trim();
 if(input.description!==undefined)payload.description=input.description.trim()||null;
 if(input.status!==undefined)payload.status=input.status;
 const {error}=await nativeSupabase.from('missions').update(payload).eq('id',missionId);if(error)throw error;
}
export async function deleteAdminMission(missionId:string){
 await requireAdmin();
 // Do not rely on historical FK cascades: older deployed schemas may not have
 // them. Remove the mission conversation explicitly before deleting the mission.
 const {data:channels,error:channelLookupError}=await nativeSupabase.from('chat_channels').select('id').eq('mission_id',missionId);
 if(channelLookupError)throw channelLookupError;
 const channelIds=(channels||[]).map((x:any)=>x.id);
 if(channelIds.length){
   const {data:messageRows,error:messageLookupError}=await nativeSupabase.from('chat_messages').select('id').in('channel_id',channelIds);
   if(messageLookupError)throw messageLookupError;
   const messageIds=(messageRows||[]).map((x:any)=>x.id);
   if(messageIds.length){
     // Receipts are optional on older deployments.
     const receiptDelete=await nativeSupabase.from('chat_message_receipts').delete().in('message_id',messageIds);
     if(receiptDelete.error && receiptDelete.error.code!=='PGRST205')throw receiptDelete.error;
   }
   const messageDelete=await nativeSupabase.from('chat_messages').delete().in('channel_id',channelIds);
   if(messageDelete.error)throw messageDelete.error;
   const channelDelete=await nativeSupabase.from('chat_channels').delete().in('id',channelIds);
   if(channelDelete.error)throw channelDelete.error;
 }
 const {error}=await nativeSupabase.from('missions').delete().eq('id',missionId);if(error)throw error;
}

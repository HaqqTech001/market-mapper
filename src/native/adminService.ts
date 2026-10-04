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

 // The cloud schema stores mission market_id as UUID. Until the dedicated cloud
 // markets registry lands, generate a stable UUID for this mission's market
 // context instead of leaving market_id null.
 const marketId=globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-'+Date.now().toString().padStart(12,'0').slice(-12);
 const {data,error}=await nativeSupabase.from('missions').insert({
  title,
  market_id:marketId,
  market_name:marketName,
  description:input.description?.trim()||null,
  mission_type:input.type||'initial_mapping',
  status:'draft',
  created_by:admin.userId,
  created_at:now,
  updated_at:now
 }).select('id').single();
 if(error){
  console.error('Mission creation failed',{code:error.code,message:error.message,details:error.details,hint:error.hint});
  throw new Error(error.message||'Mission could not be created.');
 }
 return data;
}

export async function getAdminMission(id:string){await requireAdmin();const {data,error}=await nativeSupabase.from('missions').select('id,title,description,instructions,status,mission_type,priority,market_id,market_name,assigned_starting_lat,assigned_starting_lng,created_at,mission_members(user_id,role,profiles!mission_members_user_id_fkey(full_name,email)),mission_area_assignments(area_id,area_name,assigned_to_user_id,status,notes,profiles!mission_area_assignments_assigned_to_user_id_fkey(full_name))').eq('id',id).single();if(error)throw error;return data}
export async function addAdminMissionMember(missionId:string,userId:string,role:'mapper'|'team_lead'='mapper'){await requireAdmin();const {error}=await nativeSupabase.from('mission_members').upsert({mission_id:missionId,user_id:userId,role},{onConflict:'mission_id,user_id'});if(error)throw error}
export async function removeAdminMissionMember(missionId:string,userId:string){await requireAdmin();const {error}=await nativeSupabase.from('mission_members').delete().eq('mission_id',missionId).eq('user_id',userId);if(error)throw error}
export async function addAdminMissionArea(input:{missionId:string;areaName:string;userId:string;notes?:string}){await requireAdmin();const id='area_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);const {error}=await nativeSupabase.from('mission_area_assignments').insert({mission_id:input.missionId,user_id:input.userId,assigned_to_user_id:input.userId,area_id:id,area_name:input.areaName.trim(),notes:input.notes?.trim()||null,status:'assigned'});if(error)throw error}
export async function updateAdminMissionStart(missionId:string,latitude:number,longitude:number){await requireAdmin();const {error}=await nativeSupabase.from('missions').update({assigned_starting_lat:latitude,assigned_starting_lng:longitude,updated_at:new Date().toISOString()}).eq('id',missionId);if(error)throw error}
export async function setAdminMissionStatus(missionId:string,status:'draft'|'active'|'paused'|'completed'|'cancelled'|'archived'){await requireAdmin();const {error}=await nativeSupabase.from('missions').update({status,updated_at:new Date().toISOString()}).eq('id',missionId);if(error)throw error}

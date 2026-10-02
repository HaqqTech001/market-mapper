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
 const admin=await requireAdmin();const id=crypto.randomUUID();const now=new Date().toISOString();
 const {data,error}=await nativeSupabase.from('missions').insert({id,title:input.title.trim(),market_name:input.marketName.trim(),description:input.description?.trim()||null,status:'planning',created_by:admin.userId,created_at:now,updated_at:now}).select('id').single();
 if(error)throw error;return data;
}

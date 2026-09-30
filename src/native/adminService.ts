import { nativeSupabase } from './supabase';
import type { NativeUserContext } from './userContext';
import { requireNativeUserContext } from './userContext';

async function requireAdmin():Promise<NativeUserContext>{const u=await requireNativeUserContext();if(u.role!=='admin')throw new Error('ADMIN_REQUIRED');return u}
export type AdminUser={id:string;fullName:string;email:string;role:'mapper'|'team_lead'|'admin';isActive:boolean};
export async function listAdminUsers():Promise<AdminUser[]>{await requireAdmin();const {data,error}=await nativeSupabase.from('profiles').select('id,full_name,email,role,is_active').order('full_name');if(error)throw error;return (data||[]).map((x:any)=>({id:x.id,fullName:x.full_name,email:x.email,role:x.role,isActive:x.is_active}))}
export async function updateAdminUserRole(id:string,role:AdminUser['role']){await requireAdmin();const {data,error}=await nativeSupabase.rpc('admin_update_user_role',{target_user_id:id,new_role:role});if(error)throw error;return data}
export async function setAdminUserActive(id:string,active:boolean){await requireAdmin();const {data,error}=await nativeSupabase.rpc('admin_set_user_active_status',{target_user_id:id,new_active_status:active});if(error)throw error;return data}
export async function adminCounts(){await requireAdmin();const [u,t,m]=await Promise.all([nativeSupabase.from('profiles').select('id',{count:'exact',head:true}),nativeSupabase.from('teams').select('id',{count:'exact',head:true}),nativeSupabase.from('missions').select('id',{count:'exact',head:true})]);return {users:u.count||0,teams:t.count||0,missions:m.count||0}}

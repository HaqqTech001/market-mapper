import { nativeSupabase } from './supabase';
import { MissionRepository } from '@/src/db/repositories/MissionRepository';

export async function hydrateMissionCoordination(missionId:string){
 const [{data:members,error:me},{data:areas,error:ae}]=await Promise.all([
  nativeSupabase.from('mission_members').select('user_id,role,assigned_at,profiles!mission_members_user_id_fkey(full_name)').eq('mission_id',missionId),
  nativeSupabase.from('mission_area_assignments').select('area_id,area_name,assigned_to_user_id,status,assigned_at,notes,profiles!mission_area_assignments_assigned_to_user_id_fkey(full_name)').eq('mission_id',missionId)
 ]);
 if(me)throw me;if(ae)throw ae;
 for(const m of members||[])await MissionRepository.addMember(missionId,(m as any).user_id,(m as any).profiles?.full_name||'Team Member',(m as any).role==='lead'?'lead':'mapper');
 for(const a of areas||[])await MissionRepository.assignArea(missionId,(a as any).area_id,(a as any).area_name||'Market Area',(a as any).assigned_to_user_id||undefined,(a as any).profiles?.full_name||undefined,(a as any).notes||undefined);
 return {members:(members||[]).length,areas:(areas||[]).length};
}

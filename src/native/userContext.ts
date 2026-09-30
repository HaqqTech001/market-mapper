import { nativeSupabase } from './supabase';
import { MissionRepository } from '@/src/db/repositories/MissionRepository';
import { hydrateMissionCoordination } from './missionHydration';

export type NativeUserContext = {
  userId: string;
  fullName: string;
  email: string;
  role: 'mapper' | 'team_lead' | 'admin';
};

export type NativeMissionContext = {
  id: string;
  title: string;
  marketId: string;
  description?: string | null;
  status: string;
  roleInMission: string;
};

export async function requireNativeUserContext(): Promise<NativeUserContext> {
  const { data: sessionData, error: sessionError } = await nativeSupabase.auth.getSession();
  if (sessionError) throw sessionError;
  const user = sessionData.session?.user;
  if (!user) throw new Error('AUTH_REQUIRED');

  const { data: profile, error } = await nativeSupabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('id', user.id)
    .single();
  if (error) throw error;
  if (!profile?.is_active) throw new Error('ACCOUNT_INACTIVE');

  return {
    userId: profile.id,
    fullName: profile.full_name,
    email: profile.email,
    role: profile.role,
  };
}

export async function getAssignedNativeMissions(userId: string): Promise<NativeMissionContext[]> {
  try {
    const { data, error } = await nativeSupabase
      .from('mission_members')
      .select('role, missions!inner(id, market_id, title, description, status)')
      .eq('user_id', userId);
    if (error) throw error;
    const missions = (data ?? []).map((row: any) => ({
      id: row.missions.id,
      title: row.missions.title,
      marketId: row.missions.market_id,
      description: row.missions.description,
      status: row.missions.status,
      roleInMission: row.role,
    })).filter((m) => !['cancelled', 'archived'].includes(String(m.status).toLowerCase()));
    await Promise.all(missions.map((m) => hydrateMissionCoordination(m.id).catch(() => null)));
    return missions;
  } catch (error) {
    const cached = await MissionRepository.getMissionsForUser(userId);
    if (!cached.length) throw error;
    return cached.filter((m) => !['cancelled','archived'].includes(String(m.status).toLowerCase())).map((m) => ({
      id:m.id,title:m.title,marketId:m.marketId,description:m.description,status:m.status,roleInMission:m.leadUserId===userId?'lead':'mapper'
    }));
  }
}

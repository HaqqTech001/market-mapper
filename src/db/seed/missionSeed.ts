/**
 * Initial Operational Missions & Team Seed (Phase 5)
 * Sets up structured missions, areas, members, channels, and field issues.
 */

import { DatabaseAdapter } from '../sqlite';

export async function seedInitialMissions(db: DatabaseAdapter): Promise<void> {
  const now = new Date().toISOString();

  // 1. Check if Oja-Oba mission already exists
  const existing = await db.getAllAsync<any>(`SELECT id FROM local_missions WHERE id = 'mission_oja_oba_01' LIMIT 1;`);
  if (existing.length > 0) return;

  // 2. Insert Teams
  await db.runAsync(
    `INSERT OR REPLACE INTO local_teams (id, name, code, description, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    ['team_alpha_01', 'Lagos West Alpha Unit', 'LWA-01', 'Primary surveying squad for Alaba International & Trade Fair', now, now]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO local_teams (id, name, code, description, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    ['team_island_02', 'Island Survey Unit', 'ISU-02', 'Covering Balogun, Jankara, and Lagos Island commercial zones', now, now]
  );

  // 3. Insert Markets & Areas
  await db.runAsync(
    `INSERT OR REPLACE INTO local_markets (id, name, city, state, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    ['mkt_oja_oba', 'Oja-Oba Market', 'Ibadan', 'Oyo', now, now]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO local_markets (id, name, city, state, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    ['mkt_alaba_01', 'Alaba International Market', 'Ojo', 'Lagos', now, now]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO local_markets (id, name, city, state, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, 0);`,
    ['mkt_balogun_02', 'Balogun Market', 'Lagos Island', 'Lagos', now, now]
  );

  await db.runAsync(
    `INSERT OR REPLACE INTO local_market_areas (id, market_id, name, code, area_type, boundary_polygon_json, color, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, 'gate_entrance_area', '[]', '#10b981', ?, ?, 0);`,
    ['area_gate_2_frontage', 'mkt_oja_oba', 'Gate 2 Frontage', 'G2-F', now, now]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO local_market_areas (id, market_id, name, code, area_type, boundary_polygon_json, color, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, 'general_inside_market', '[]', '#10b981', ?, ?, 0);`,
    ['area_line_a', 'mkt_alaba_01', 'Line A (Inverters & Solar)', 'L-A', now, now]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO local_market_areas (id, market_id, name, code, area_type, boundary_polygon_json, color, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, 'general_inside_market', '[]', '#059669', ?, ?, 0);`,
    ['area_line_b', 'mkt_alaba_01', 'Line B (Audio & Heavy Electronics)', 'L-B', now, now]
  );
  await db.runAsync(
    `INSERT OR REPLACE INTO local_market_areas (id, market_id, name, code, area_type, boundary_polygon_json, color, created_at, updated_at, is_deleted)
     VALUES (?, ?, ?, ?, 'gate_entrance_area', '[]', '#f59e0b', ?, ?, 0);`,
    ['area_gate_3', 'mkt_alaba_01', 'Gate 3 Access Zone', 'G-03', now, now]
  );

  // 4. Insert Missions
  const missions = [
    {
      id: 'mission_oja_oba_01',
      market_id: 'mkt_oja_oba',
      market_name: 'Oja-Oba Market',
      title: 'Oja-Oba Initial Mapping',
      mission_type: 'initial_mapping',
      status: 'active',
      priority: 'high',
      team_id: 'team_alpha_01',
      team_name: 'Oja-Oba Mapping Team',
      lead_user_id: 'usr_lead_01',
      description: 'Map all businesses and internal paths from North Gate to Junction J12. Mark blocked passages as issues.',
      target_stalls: 45,
      estimated_hours: 8,
      due_date: '2026-10-10',
      created_by: 'usr_admin_01',
    },
    {
      id: 'mission_alaba_01',
      market_id: 'mkt_alaba_01',
      market_name: 'Alaba International Market, Ojo, Lagos',
      title: 'Alaba International — Electrical & Inverter Corridors',
      mission_type: 'initial_mapping',
      status: 'active',
      priority: 'high',
      team_id: 'team_alpha_01',
      team_name: 'Lagos West Alpha Unit',
      lead_user_id: 'usr_lead_01',
      description: 'Comprehensive mapping sweep covering Line A (Inverters & Solar), Line B (Audio Electronics), and Gate 3 Access.',
      target_stalls: 150,
      estimated_hours: 12,
      due_date: '2026-10-01',
      created_by: 'usr_admin_01',
    },
    {
      id: 'mission_balogun_02',
      market_id: 'mkt_balogun_02',
      market_name: 'Balogun Market, Lagos Island, Lagos',
      title: 'Balogun Market — Textile & Fabric Lines',
      mission_type: 'verification',
      status: 'scheduled',
      priority: 'medium',
      team_id: 'team_island_02',
      team_name: 'Island Survey Unit',
      lead_user_id: 'usr_lead_01',
      description: 'Revisit and verification of fabric importers along Martins Street and Broad Street frontage.',
      target_stalls: 80,
      estimated_hours: 6,
      due_date: '2026-10-15',
      created_by: 'usr_admin_01',
    },
    {
      id: 'mission_wuse_03',
      market_id: 'mkt_alaba_01',
      market_name: 'Wuse Market, Zone 5, Abuja FCT',
      title: 'Wuse Market — Section 1 Provisions & Spices',
      mission_type: 'initial_mapping',
      status: 'completed',
      priority: 'low',
      team_id: 'team_alpha_01',
      team_name: 'Abuja Central Crew',
      lead_user_id: 'usr_lead_01',
      description: 'Completed baseline survey of spice blocks and provisions corridor with 84 verified stores.',
      target_stalls: 84,
      estimated_hours: 8,
      due_date: '2026-08-28',
      created_by: 'usr_admin_01',
    },
  ];

  for (const m of missions) {
    await db.runAsync(
      `INSERT INTO local_missions (
        id, market_id, market_name, title, mission_type, status, priority,
        team_id, team_name, lead_user_id, description, target_stalls,
        estimated_hours, due_date, created_by, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
      [
        m.id,
        m.market_id,
        m.market_name,
        m.title,
        m.mission_type,
        m.status,
        m.priority,
        m.team_id,
        m.team_name,
        m.lead_user_id,
        m.description,
        m.target_stalls,
        m.estimated_hours,
        m.due_date,
        m.created_by,
        now,
        now,
      ]
    );
  }

  // 5. Insert Mission Members
  await db.runAsync(
    `INSERT INTO local_mission_members (id, mission_id, user_id, user_name, role_in_mission, assigned_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 'local_only');`,
    ['mm_oja_lead', 'mission_oja_oba_01', 'usr_lead_01', 'Amina Yusuf', 'lead', now]
  );
  await db.runAsync(
    `INSERT INTO local_mission_members (id, mission_id, user_id, user_name, role_in_mission, assigned_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 'local_only');`,
    ['mm_oja_mapper', 'mission_oja_oba_01', 'usr_mapper_01', 'Chioma Adebayo', 'mapper', now]
  );
  await db.runAsync(
    `INSERT INTO local_mission_members (id, mission_id, user_id, user_name, role_in_mission, assigned_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 'local_only');`,
    ['mm_01_lead', 'mission_alaba_01', 'usr_lead_01', 'Ibrahim Danladi', 'lead', now]
  );
  await db.runAsync(
    `INSERT INTO local_mission_members (id, mission_id, user_id, user_name, role_in_mission, assigned_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, 'local_only');`,
    ['mm_01_mapper', 'mission_alaba_01', 'usr_mapper_01', 'Chioma Adebayo', 'mapper', now]
  );

  // 6. Insert Area Assignments
  await db.runAsync(
    `INSERT INTO local_mission_area_assignments (
      id, mission_id, area_id, area_name, assigned_to_user_id, assigned_to_user_name, status, assigned_at, notes, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
    ['maa_oja_01', 'mission_oja_oba_01', 'area_gate_2_frontage', 'Gate 2 Frontage', 'usr_mapper_01', 'Chioma Adebayo', 'in_progress', now, 'Map all businesses and internal paths from North Gate to Junction J12. Mark blocked passages as issues.']
  );
  await db.runAsync(
    `INSERT INTO local_mission_area_assignments (
      id, mission_id, area_id, area_name, assigned_to_user_id, assigned_to_user_name, status, assigned_at, notes, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
    ['maa_01', 'mission_alaba_01', 'area_line_a', 'Line A (Inverters & Solar)', 'usr_mapper_01', 'Chioma Adebayo', 'in_progress', now, 'Record all permanent inverter stores and battery service kiosks']
  );
  await db.runAsync(
    `INSERT INTO local_mission_area_assignments (
      id, mission_id, area_id, area_name, assigned_to_user_id, assigned_to_user_name, status, assigned_at, notes, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only');`,
    ['maa_02', 'mission_alaba_01', 'area_line_b', 'Line B (Audio & Heavy Electronics)', 'usr_mapper_01', 'Chioma Adebayo', 'assigned', now, 'Survey speaker and amplifier importers']
  );

  // 7. Insert Initial Notifications
  await db.runAsync(
    `INSERT INTO local_notifications (id, recipient_id, type, title, body, entity_reference_type, entity_reference_id, is_read, created_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'local_only');`,
    ['notif_oja_01', 'usr_mapper_01', 'new_mission', 'NEW MAPPING MISSION', 'Oja-Oba Initial Mapping — Assigned Area: Gate 2 Frontage. Tap to view mission instructions.', 'mission', 'mission_oja_oba_01', now]
  );
  await db.runAsync(
    `INSERT INTO local_notifications (id, recipient_id, type, title, body, entity_reference_type, entity_reference_id, is_read, created_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'local_only');`,
    ['notif_01', 'usr_mapper_01', 'mission_assignment', 'Assigned to Line A Mapping Sweep', 'Lead Ibrahim assigned you to Line A (Inverters & Solar) in Alaba International.', 'mission', 'mission_alaba_01', now]
  );
  await db.runAsync(
    `INSERT INTO local_notifications (id, recipient_id, type, title, body, entity_reference_type, entity_reference_id, is_read, created_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'local_only');`,
    ['notif_02', 'usr_mapper_01', 'team_update', 'Lagos West Alpha Briefing', 'Gate 3 road grading today. Focus initial sweeps on Line A & B first.', 'chat', 'chn_team_alpha_01', now]
  );

  // 8. Insert Initial Chat Messages in Team Channel
  await db.runAsync(
    `INSERT INTO local_chat_channels (id, name, channel_type, team_id, mission_id, unread_count, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?);`,
    ['chn_oja_team_01', 'Oja-Oba Mapping Team', 'team', 'team_alpha_01', 'mission_oja_oba_01', now]
  );
  await db.runAsync(
    `INSERT INTO local_chat_channels (id, name, channel_type, team_id, mission_id, unread_count, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?);`,
    ['chn_oja_initial_02', 'Oja-Oba Initial Mapping', 'mission', 'team_alpha_01', 'mission_oja_oba_01', now]
  );
  await db.runAsync(
    `INSERT INTO local_chat_channels (id, name, channel_type, team_id, mission_id, unread_count, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?);`,
    ['chn_ops_announcements', 'Operations Announcements', 'broadcast', 'team_alpha_01', null, now]
  );
  await db.runAsync(
    `INSERT INTO local_chat_channels (id, name, channel_type, team_id, mission_id, unread_count, created_at)
     VALUES (?, ?, ?, ?, ?, 0, ?);`,
    ['chn_team_alpha_01', 'Lagos West Alpha Channel', 'team', 'team_alpha_01', 'mission_alaba_01', now]
  );

  await db.runAsync(
    `INSERT INTO local_chat_messages (
      id, channel_id, sender_id, sender_name, sender_role, text, is_pinned, created_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 'local_only');`,
    [
      'msg_seed_01',
      'chn_team_alpha_01',
      'usr_lead_01',
      'Ibrahim Danladi (Team Lead)',
      'team_lead',
      'Good morning Lagos West Alpha team. Alaba Gate 3 has road grading today. Focus your mapping sweeps on Line A & B first.',
      now,
    ]
  );

  await db.runAsync(
    `INSERT INTO local_chat_messages (
      id, channel_id, sender_id, sender_name, sender_role, text, is_pinned, linked_business_name, created_at, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 'local_only');`,
    [
      'msg_seed_02',
      'chn_team_alpha_01',
      'usr_mapper_01',
      'Chioma Adebayo',
      'mapper',
      'Copy that Lead! Started Line A corridor. Logged first 5 solar battery distributors with verified GPS canopy nudge.',
      'De-God Solar Tech Hub (B-CHIO-001)',
      now,
    ]
  );
}

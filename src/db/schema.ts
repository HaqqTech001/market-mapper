/**
 * Market Mapper V1 Local SQLite DDL Definitions
 * Frozen Architecture Baseline
 */

export const MIGRATION_VERSION_1 = 1;

export const DDL_V1 = [
  // 0. Schema Migration Tracker
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );`,

  // 1. Profiles & Teams
  `CREATE TABLE IF NOT EXISTS local_profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'mapper',
    is_active INTEGER NOT NULL DEFAULT 1,
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS local_teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE TABLE IF NOT EXISTS local_team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    team_role TEXT NOT NULL DEFAULT 'member',
    joined_at TEXT NOT NULL,
    UNIQUE(team_id, user_id)
  );`,

  // 2. Spatial Entities: Markets, Areas & Places
  `CREATE TABLE IF NOT EXISTS local_markets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    boundary_geojson TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE TABLE IF NOT EXISTS local_market_areas (
    id TEXT PRIMARY KEY,
    market_id TEXT NOT NULL,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    area_type TEXT NOT NULL DEFAULT 'general_inside_market',
    boundary_polygon_json TEXT NOT NULL,
    color TEXT DEFAULT '#10b981',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE TABLE IF NOT EXISTS local_market_places (
    id TEXT PRIMARY KEY,
    market_id TEXT NOT NULL,
    area_id TEXT,
    operational_label TEXT NOT NULL,
    display_name TEXT,
    place_type TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    description TEXT,
    photo_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );`,

  // 3. Missions
  `CREATE TABLE IF NOT EXISTS local_missions (
    id TEXT PRIMARY KEY,
    market_id TEXT NOT NULL,
    title TEXT NOT NULL,
    mission_type TEXT NOT NULL DEFAULT 'initial_mapping',
    status TEXT NOT NULL DEFAULT 'draft',
    team_id TEXT,
    description TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS local_mission_members (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role_in_mission TEXT NOT NULL DEFAULT 'mapper',
    assigned_at TEXT NOT NULL,
    UNIQUE(mission_id, user_id)
  );`,

  `CREATE TABLE IF NOT EXISTS local_mission_area_assignments (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    area_id TEXT NOT NULL,
    assigned_to_user_id TEXT,
    status TEXT NOT NULL DEFAULT 'assigned',
    assigned_at TEXT NOT NULL,
    UNIQUE(mission_id, area_id)
  );`,

  // 4. Normalized Catalogue (Goods & Services)
  `CREATE TABLE IF NOT EXISTS local_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    icon_name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE TABLE IF NOT EXISTS local_catalogue_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    primary_category_id TEXT,
    description TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS local_catalogue_item_categories (
    catalogue_item_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    PRIMARY KEY(catalogue_item_id, category_id)
  );`,

  `CREATE TABLE IF NOT EXISTS local_catalogue_aliases (
    id TEXT PRIMARY KEY,
    catalogue_item_id TEXT NOT NULL,
    alias_name TEXT NOT NULL,
    language_or_dialect TEXT DEFAULT 'en',
    UNIQUE(catalogue_item_id, alias_name)
  );`,

  `CREATE TABLE IF NOT EXISTS local_catalogue_suggestions (
    id TEXT PRIMARY KEY,
    suggested_by TEXT NOT NULL,
    name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    suggested_category_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    merged_into_id TEXT,
    reviewer_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );`,

  // 5. Businesses & Offerings
  `CREATE TABLE IF NOT EXISTS local_businesses (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    market_id TEXT,
    area_id TEXT,
    operational_label TEXT,
    business_type TEXT NOT NULL,
    physical_structure TEXT,
    activity TEXT NOT NULL,
    location_relationship TEXT DEFAULT 'general_inside_market',
    name TEXT,
    has_no_visible_name INTEGER NOT NULL DEFAULT 0,
    stall_number TEXT,
    line_name TEXT,
    row_block_floor TEXT,
    row_line TEXT,
    block TEXT,
    floor TEXT,
    primary_category_id TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    location_accuracy REAL,
    location_source TEXT NOT NULL DEFAULT 'current_gps',
    original_latitude REAL,
    original_longitude REAL,
    stability TEXT NOT NULL DEFAULT 'unknown',
    local_photo_uri TEXT,
    remote_photo_path TEXT,
    photo_declined INTEGER NOT NULL DEFAULT 0,
    photo_state TEXT DEFAULT 'not_captured',
    phone TEXT,
    owner_name TEXT,
    notes TEXT,
    completeness_score INTEGER NOT NULL DEFAULT 100,
    revisit_needed INTEGER NOT NULL DEFAULT 0,
    revisit_reason TEXT,
    revisit_notes TEXT,
    trader_interaction_status TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    client_created_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );`,

  `CREATE TABLE IF NOT EXISTS local_business_offerings (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    catalogue_item_id TEXT NOT NULL,
    how_established TEXT NOT NULL DEFAULT 'observed',
    created_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only',
    UNIQUE(business_id, catalogue_item_id)
  );`,

  // 6. Paths & Junctions
  `CREATE TABLE IF NOT EXISTS local_paths (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    mission_id TEXT NOT NULL,
    name TEXT NOT NULL,
    distance_meters REAL NOT NULL,
    duration_seconds INTEGER NOT NULL,
    junctions_count INTEGER NOT NULL DEFAULT 0,
    geojson_geometry TEXT NOT NULL,
    raw_points_json TEXT NOT NULL,
    is_multi_segment INTEGER NOT NULL DEFAULT 0,
    is_verified INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    created_by TEXT NOT NULL,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    client_created_at TEXT NOT NULL,
    is_deleted INTEGER NOT NULL DEFAULT 0,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );`,

  `CREATE TABLE IF NOT EXISTS local_path_junctions (
    id TEXT PRIMARY KEY,
    session_id TEXT,
    path_id TEXT,
    operational_label TEXT NOT NULL,
    display_name TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    sequence_number INTEGER NOT NULL DEFAULT 0,
    junction_order INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER,
    is_excluded INTEGER NOT NULL DEFAULT 0,
    exclusion_reason TEXT,
    created_at TEXT NOT NULL
  );`,

  // Efficient Incremental Path Recording Persistence (Avoids 5s massive array rewrites)
  `CREATE TABLE IF NOT EXISTS local_path_sessions (
    session_id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    last_saved_at TEXT NOT NULL,
    distance_meters REAL NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    junctions_count INTEGER NOT NULL DEFAULT 0,
    is_paused INTEGER NOT NULL DEFAULT 0
  );`,

  `CREATE TABLE IF NOT EXISTS local_path_points_raw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    accuracy REAL,
    speed REAL,
    heading REAL,
    is_junction INTEGER NOT NULL DEFAULT 0,
    junction_label TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS local_path_checkpoints (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    points_count INTEGER NOT NULL,
    last_latitude REAL NOT NULL,
    last_longitude REAL NOT NULL,
    created_at TEXT NOT NULL
  );`,

  // 7. Revisits
  `CREATE TABLE IF NOT EXISTS local_revisits (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_title TEXT,
    reason TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    assigned_to TEXT,
    flagged_by TEXT NOT NULL,
    resolved_by TEXT,
    resolution_notes TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );`,

  // 8. Chat & Notifications
  `CREATE TABLE IF NOT EXISTS local_chat_channels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    channel_type TEXT NOT NULL,
    team_id TEXT,
    mission_id TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    last_message_snippet TEXT,
    last_message_time TEXT,
    created_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS local_chat_messages (
    id TEXT PRIMARY KEY,
    channel_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    sender_avatar TEXT,
    sender_role TEXT NOT NULL,
    reply_to_id TEXT,
    text TEXT NOT NULL,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    linked_business_id TEXT,
    linked_path_id TEXT,
    shared_location_json TEXT,
    created_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS local_notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    entity_reference_type TEXT,
    entity_reference_id TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`,

  // 9. Sync & Queues: Outbox & SEPARATE Media Upload Queue
  `CREATE TABLE IF NOT EXISTS local_outbox_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('INSERT', 'UPDATE', 'DELETE')),
    payload TEXT NOT NULL,
    client_timestamp INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'syncing', 'failed', 'conflict')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT
  );`,

  `CREATE TABLE IF NOT EXISTS local_media_upload_queue (
    id TEXT PRIMARY KEY,
    local_uri TEXT NOT NULL,
    bucket TEXT NOT NULL,
    remote_path TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'uploading', 'uploaded', 'failed')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS local_sync_conflicts (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    local_version INTEGER NOT NULL,
    server_version INTEGER NOT NULL,
    local_payload TEXT NOT NULL,
    server_payload TEXT NOT NULL,
    conflict_detected_at TEXT NOT NULL,
    resolution_status TEXT NOT NULL DEFAULT 'unresolved' CHECK(resolution_status IN ('unresolved', 'resolved'))
  );`,

  // 10. Performance Indexes for Local Lookups & Offline Queries
  `CREATE INDEX IF NOT EXISTS idx_businesses_mission ON local_businesses(mission_id);`,
  `CREATE INDEX IF NOT EXISTS idx_businesses_sync ON local_businesses(sync_status);`,
  `CREATE INDEX IF NOT EXISTS idx_paths_mission ON local_paths(mission_id);`,
  `CREATE INDEX IF NOT EXISTS idx_path_points_session ON local_path_points_raw(session_id, timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_outbox_status ON local_outbox_queue(status, client_timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_media_upload_status ON local_media_upload_queue(status, retry_count);`,
  `CREATE INDEX IF NOT EXISTS idx_revisits_status ON local_revisits(status, mission_id);`,
  `CREATE INDEX IF NOT EXISTS idx_catalogue_items_category ON local_catalogue_items(primary_category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_catalogue_aliases_name ON local_catalogue_aliases(alias_name);`
];

/**
 * Migration Version 2 — Phase 3: Map Core, Location Engine & Production Path Recording
 * Adds multi-segment support, raw GPS sample metadata, conservative quality filtering attributes,
 * session status/active duration, junction session tracking, and correction audit log.
 */
export const MIGRATION_VERSION_2 = 2;

export const DDL_V2 = [
  // 1. Path Segments Table (Supports pause/resume without drawing artificial lines across paused movement)
  `CREATE TABLE IF NOT EXISTS local_path_segments (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    segment_index INTEGER NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    is_closed INTEGER NOT NULL DEFAULT 0
  );`,

  // 2. Add Active Duration and Status columns to local_path_sessions
  `ALTER TABLE local_path_sessions ADD COLUMN active_duration_seconds INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE local_path_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'recording';`,

  // 3. Add Phase 3 attributes to raw GPS samples
  `ALTER TABLE local_path_points_raw ADD COLUMN segment_id TEXT;`,
  `ALTER TABLE local_path_points_raw ADD COLUMN sequence_number INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE local_path_points_raw ADD COLUMN altitude REAL;`,
  `ALTER TABLE local_path_points_raw ADD COLUMN altitude_accuracy REAL;`,
  `ALTER TABLE local_path_points_raw ADD COLUMN accepted INTEGER NOT NULL DEFAULT 1;`,
  `ALTER TABLE local_path_points_raw ADD COLUMN rejection_reason TEXT;`,
  `ALTER TABLE local_path_points_raw ADD COLUMN created_at TEXT;`,

  // 4. Add session tracking columns and exclusion status to junctions
  `ALTER TABLE local_path_junctions ADD COLUMN session_id TEXT;`,
  `ALTER TABLE local_path_junctions ADD COLUMN sequence_number INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE local_path_junctions ADD COLUMN timestamp INTEGER;`,
  `ALTER TABLE local_path_junctions ADD COLUMN is_excluded INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE local_path_junctions ADD COLUMN exclusion_reason TEXT;`,

  // 5. Add session reference and multi-segment flag to local_paths
  `ALTER TABLE local_paths ADD COLUMN session_id TEXT;`,
  `ALTER TABLE local_paths ADD COLUMN is_multi_segment INTEGER NOT NULL DEFAULT 0;`,

  // 6. Audit Log for field undos, trims, and corrections
  `CREATE TABLE IF NOT EXISTS local_path_corrections_log (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    correction_type TEXT NOT NULL,
    details TEXT,
    points_affected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );`,

  // 6. Production Path Recording Indexes
  `CREATE INDEX IF NOT EXISTS idx_segments_session ON local_path_segments(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_points_session_v2 ON local_path_points_raw(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_points_segment_v2 ON local_path_points_raw(segment_id);`,
  `CREATE INDEX IF NOT EXISTS idx_points_seq_v2 ON local_path_points_raw(sequence_number);`,
  `CREATE INDEX IF NOT EXISTS idx_points_timestamp_v2 ON local_path_points_raw(timestamp);`,
  `CREATE INDEX IF NOT EXISTS idx_points_accepted_v2 ON local_path_points_raw(accepted);`,
  `CREATE INDEX IF NOT EXISTS idx_junctions_session ON local_path_junctions(session_id);`,
  `CREATE INDEX IF NOT EXISTS idx_junctions_path ON local_path_junctions(path_id);`,
  `CREATE INDEX IF NOT EXISTS idx_corrections_session ON local_path_corrections_log(session_id);`
];

/**
 * Migration Version 3 — Phase 4: Business Capture, Rapid Mapping, Offers & Local Media
 * Adds operational business labels, location audit sources, rapid structure attributes,
 * normalized media records, offering extensions (pending suggestions), and revisit flags.
 */
export const MIGRATION_VERSION_3 = 3;

export const DDL_V3 = [
  // 1. Enhanced Business Fields
  `ALTER TABLE local_businesses ADD COLUMN operational_label TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN market_id TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN physical_structure TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN photo_state TEXT DEFAULT 'not_captured';`,
  `ALTER TABLE local_businesses ADD COLUMN location_source TEXT NOT NULL DEFAULT 'current_gps';`,
  `ALTER TABLE local_businesses ADD COLUMN location_accuracy REAL;`,
  `ALTER TABLE local_businesses ADD COLUMN original_latitude REAL;`,
  `ALTER TABLE local_businesses ADD COLUMN original_longitude REAL;`,
  `ALTER TABLE local_businesses ADD COLUMN row_line TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN block TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN floor TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN revisit_needed INTEGER NOT NULL DEFAULT 0;`,
  `ALTER TABLE local_businesses ADD COLUMN revisit_reason TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN revisit_notes TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN trader_interaction_status TEXT;`,

  // 2. Enhanced Business Offerings (Supports pending local suggestions)
  `ALTER TABLE local_business_offerings ADD COLUMN pending_suggestion_id TEXT;`,
  `ALTER TABLE local_business_offerings ADD COLUMN item_type TEXT NOT NULL DEFAULT 'product';`,
  `ALTER TABLE local_business_offerings ADD COLUMN item_name TEXT;`,

  // 3. Enhanced Catalogue Suggestions
  `ALTER TABLE local_catalogue_suggestions ADD COLUMN notes TEXT;`,
  `ALTER TABLE local_catalogue_suggestions ADD COLUMN market_id TEXT;`,

  // 4. Normalized Local Media Storage (per 4V)
  `CREATE TABLE IF NOT EXISTS local_media (
    id TEXT PRIMARY KEY,
    owner_user_id TEXT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    media_type TEXT NOT NULL,
    local_uri TEXT NOT NULL,
    thumbnail_uri TEXT,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    capture_source TEXT,
    upload_status TEXT NOT NULL DEFAULT 'local_only',
    remote_path TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // 5. Local Business Revisits Tracking
  `CREATE TABLE IF NOT EXISTS local_business_revisits (
    id TEXT PRIMARY KEY,
    business_id TEXT NOT NULL,
    mission_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    flagged_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    resolved_at TEXT,
    resolution_notes TEXT
  );`,

  // 6. Phase 4 Performance & Lookup Indexes
  `CREATE INDEX IF NOT EXISTS idx_businesses_operational_label ON local_businesses(operational_label);`,
  `CREATE INDEX IF NOT EXISTS idx_businesses_market ON local_businesses(market_id);`,
  `CREATE INDEX IF NOT EXISTS idx_businesses_area ON local_businesses(area_id);`,
  `CREATE INDEX IF NOT EXISTS idx_businesses_primary_cat ON local_businesses(primary_category_id);`,
  `CREATE INDEX IF NOT EXISTS idx_businesses_revisit ON local_businesses(revisit_needed);`,
  `CREATE INDEX IF NOT EXISTS idx_business_offerings_biz ON local_business_offerings(business_id);`,
  `CREATE INDEX IF NOT EXISTS idx_business_offerings_item ON local_business_offerings(catalogue_item_id);`,
  `CREATE INDEX IF NOT EXISTS idx_business_offerings_sugg ON local_business_offerings(pending_suggestion_id);`,
  `CREATE INDEX IF NOT EXISTS idx_media_entity ON local_media(entity_id, entity_type);`,
  `CREATE INDEX IF NOT EXISTS idx_catalogue_suggestions_status ON local_catalogue_suggestions(status);`
];

/**
 * Migration Version 4 — Phase 5: Missions, Team Coordination, Notifications, Handover & Operational Chat
 * Provides durable local schemas for team missions, area assignments, shift handovers,
 * field issue alerts, area reconciliation, and enriched chat links.
 */
export const MIGRATION_VERSION_4 = 4;

export const DDL_V4 = [
  // 1. Enhanced Missions Columns
  `ALTER TABLE local_missions ADD COLUMN priority TEXT DEFAULT 'medium';`,
  `ALTER TABLE local_missions ADD COLUMN market_name TEXT;`,
  `ALTER TABLE local_missions ADD COLUMN team_name TEXT;`,
  `ALTER TABLE local_missions ADD COLUMN lead_user_id TEXT;`,
  `ALTER TABLE local_missions ADD COLUMN target_stalls INTEGER DEFAULT 100;`,
  `ALTER TABLE local_missions ADD COLUMN estimated_hours REAL DEFAULT 8;`,
  `ALTER TABLE local_missions ADD COLUMN due_date TEXT;`,
  `ALTER TABLE local_missions ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local_only';`,

  // 2. Enhanced Mission Members & Area Assignments
  `ALTER TABLE local_mission_members ADD COLUMN user_name TEXT;`,
  `ALTER TABLE local_mission_members ADD COLUMN user_avatar TEXT;`,
  `ALTER TABLE local_mission_members ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local_only';`,

  `ALTER TABLE local_mission_area_assignments ADD COLUMN area_name TEXT;`,
  `ALTER TABLE local_mission_area_assignments ADD COLUMN assigned_to_user_name TEXT;`,
  `ALTER TABLE local_mission_area_assignments ADD COLUMN completed_at TEXT;`,
  `ALTER TABLE local_mission_area_assignments ADD COLUMN notes TEXT;`,
  `ALTER TABLE local_mission_area_assignments ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local_only';`,

  // 3. Shift Handovers Table
  `CREATE TABLE IF NOT EXISTS local_handovers (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    mission_title TEXT,
    area_id TEXT NOT NULL,
    area_name TEXT,
    from_user_id TEXT NOT NULL,
    from_user_name TEXT,
    to_user_id TEXT NOT NULL,
    to_user_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    checklist_json TEXT NOT NULL,
    stalls_count_at_handover INTEGER NOT NULL DEFAULT 0,
    paths_count_at_handover INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );`,

  // 4. Field Issues & Blockages Table
  `CREATE TABLE IF NOT EXISTS local_field_issues (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    mission_title TEXT,
    area_id TEXT,
    area_name TEXT,
    reported_by TEXT NOT NULL,
    reported_by_name TEXT,
    reported_by_role TEXT,
    issue_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    location_label TEXT,
    photo_uri TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    resolved_by TEXT,
    resolved_by_name TEXT,
    resolution_notes TEXT,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );`,

  // 5. Area Reconciliations Table
  `CREATE TABLE IF NOT EXISTS local_area_reconciliations (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    mission_title TEXT,
    area_id TEXT NOT NULL,
    area_name TEXT NOT NULL,
    reconciled_by TEXT NOT NULL,
    reconciled_by_name TEXT,
    stalls_counted INTEGER NOT NULL DEFAULT 0,
    paths_recorded INTEGER NOT NULL DEFAULT 0,
    unresolved_issues_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending_lead_review',
    review_notes TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'local_only'
  );`,

  // 6. Audit Logs & Mission Announcements Tables
  `CREATE TABLE IF NOT EXISTS local_audit_logs (
    id TEXT PRIMARY KEY,
    action_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_name TEXT,
    details_json TEXT,
    created_at TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS local_mission_announcements (
    id TEXT PRIMARY KEY,
    mission_id TEXT NOT NULL,
    author_id TEXT NOT NULL,
    author_name TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,

  // 7. Enhanced Chat Messages & Notifications
  `ALTER TABLE local_chat_messages ADD COLUMN linked_business_name TEXT;`,
  `ALTER TABLE local_chat_messages ADD COLUMN linked_path_name TEXT;`,
  `ALTER TABLE local_chat_messages ADD COLUMN linked_issue_id TEXT;`,
  `ALTER TABLE local_chat_messages ADD COLUMN linked_issue_title TEXT;`,
  `ALTER TABLE local_chat_messages ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local_only';`,

  `ALTER TABLE local_notifications ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'local_only';`,
  `ALTER TABLE local_handovers ADD COLUMN continuation_ref TEXT;`,

  // 8. Phase 5 Performance & Lookup Indexes
  `CREATE INDEX IF NOT EXISTS idx_missions_status ON local_missions(status);`,
  `CREATE INDEX IF NOT EXISTS idx_missions_market ON local_missions(market_id);`,
  `CREATE INDEX IF NOT EXISTS idx_mission_members_user ON local_mission_members(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_mission_assignments_user ON local_mission_area_assignments(assigned_to_user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_handovers_status ON local_handovers(status, mission_id);`,
  `CREATE INDEX IF NOT EXISTS idx_handovers_users ON local_handovers(from_user_id, to_user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_field_issues_mission ON local_field_issues(mission_id, status);`,
  `CREATE INDEX IF NOT EXISTS idx_area_reconciliations_mission ON local_area_reconciliations(mission_id, area_id);`,
  `CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON local_chat_messages(channel_id, created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON local_notifications(recipient_id, is_read);`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON local_audit_logs(entity_type, entity_id);`,
  `CREATE INDEX IF NOT EXISTS idx_announcements_mission ON local_mission_announcements(mission_id);`
];

// Phase 5 Junction Types & Business Relative Positions
export const MIGRATION_VERSION_5 = 5;

export const DDL_V5 = [
  `ALTER TABLE local_path_junctions ADD COLUMN junction_type TEXT DEFAULT 'unknown';`,
  `ALTER TABLE local_path_junctions ADD COLUMN market_id TEXT;`,
  `ALTER TABLE local_path_junctions ADD COLUMN mission_id TEXT;`,
  `ALTER TABLE local_path_junctions ADD COLUMN created_by TEXT;`,
  `ALTER TABLE local_path_junctions ADD COLUMN verification_state TEXT DEFAULT 'unverified';`,
  `ALTER TABLE local_path_junctions ADD COLUMN location_source TEXT DEFAULT 'current_gps';`,

  `ALTER TABLE local_businesses ADD COLUMN relative_position TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN captured_heading REAL;`,
  `ALTER TABLE local_businesses ADD COLUMN parent_path_session_id TEXT;`,
  `ALTER TABLE local_businesses ADD COLUMN proposed_latitude REAL;`,
  `ALTER TABLE local_businesses ADD COLUMN proposed_longitude REAL;`
];

// Phase 5 Productionization: Junction Branch Tracking
export const MIGRATION_VERSION_6 = 6;

export const DDL_V6 = [
  `ALTER TABLE local_path_junctions ADD COLUMN branches_json TEXT;`,
  `CREATE TABLE IF NOT EXISTS local_junction_branches (
    id TEXT PRIMARY KEY,
    junction_id TEXT NOT NULL,
    label TEXT NOT NULL,
    relative_side TEXT,
    status TEXT NOT NULL DEFAULT 'unmapped',
    connected_path_id TEXT,
    connected_target_junction_id TEXT,
    notes TEXT,
    mapped_at TEXT,
    mapped_by TEXT,
    created_at TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_junction_branches_junc ON local_junction_branches(junction_id);`,
  `CREATE INDEX IF NOT EXISTS idx_junction_branches_status ON local_junction_branches(status);`
];




export const MIGRATION_VERSION_7 = 7;
export const DDL_V7 = [
  `ALTER TABLE local_chat_messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text';`,
  `ALTER TABLE local_chat_messages ADD COLUMN attachment_json TEXT;`,
  `ALTER TABLE local_chat_messages ADD COLUMN reactions_json TEXT;`,
  `ALTER TABLE local_chat_messages ADD COLUMN edited_at TEXT;`,
  `ALTER TABLE local_chat_messages ADD COLUMN deleted_at TEXT;`
];


// Native runtime compatibility: channel preferences used by cloud hydration.
export const MIGRATION_VERSION_8 = 8;
export const DDL_V8 = [
  `ALTER TABLE local_chat_channels ADD COLUMN is_muted INTEGER NOT NULL DEFAULT 0;`,
];

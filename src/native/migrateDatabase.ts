import {
  DDL_V1, DDL_V2, DDL_V3, DDL_V4, DDL_V5, DDL_V6, DDL_V7, DDL_V8,
  MIGRATION_VERSION_1, MIGRATION_VERSION_2, MIGRATION_VERSION_3,
  MIGRATION_VERSION_4, MIGRATION_VERSION_5, MIGRATION_VERSION_6, MIGRATION_VERSION_7, MIGRATION_VERSION_8,
} from '@/src/db/schema';
import { seedInitialCatalogue } from '@/src/db/seed/catalogueSeed';
import type { DatabaseAdapter } from '@/src/db/sqlite';

const migrations = [
  { version: MIGRATION_VERSION_1, name: 'initial_v1_schema', ddl: DDL_V1 },
  { version: MIGRATION_VERSION_2, name: 'v2_path_recording_engine', ddl: DDL_V2 },
  { version: MIGRATION_VERSION_3, name: 'v3_business_capture_and_media', ddl: DDL_V3 },
  { version: MIGRATION_VERSION_4, name: 'v4_team_coordination_and_chat', ddl: DDL_V4 },
  { version: MIGRATION_VERSION_5, name: 'v5_junction_types_and_relative_positions', ddl: DDL_V5 },
  { version: MIGRATION_VERSION_6, name: 'v6_junction_branch_tracking', ddl: DDL_V6 },
  { version: MIGRATION_VERSION_7, name: 'v7_rich_chat_messages', ddl: DDL_V7 },
  { version: MIGRATION_VERSION_8, name: 'v8_chat_channel_preferences', ddl: DDL_V8 },
] as const;

const ADD_COLUMN_PATTERN =
  /^ALTER\s+TABLE\s+["`\[]?([^\s"`\]]+)["`\]]?\s+ADD\s+COLUMN\s+["`\[]?([^\s"`\]]+)["`\]]?/i;

async function hasColumn(
  db: DatabaseAdapter,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const escapedTable = tableName.replace(/"/g, '""');
  const columns = await db.getAllAsync<{ name: string }>(
    `PRAGMA table_info("${escapedTable}");`,
  );
  return columns.some(
    (column) => column.name.toLowerCase() === columnName.toLowerCase(),
  );
}

async function executeMigrationStatement(
  db: DatabaseAdapter,
  ddl: string,
): Promise<void> {
  const addColumn = ddl.trim().match(ADD_COLUMN_PATTERN);

  if (addColumn) {
    const [, tableName, columnName] = addColumn;
    if (await hasColumn(db, tableName, columnName)) return;
  }

  await db.execAsync(ddl);
}

export async function migrateNativeDatabase(db: DatabaseAdapter): Promise<number> {

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );`);

  const current = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;'
  );
  let version = Number(current?.version ?? 0);

  for (const migration of migrations) {
    if (version >= migration.version) continue;

    for (const ddl of migration.ddl) {
      await executeMigrationStatement(db, ddl);
    }

    await db.runAsync(
      'INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);',
      [migration.version, migration.name, new Date().toISOString()],
    );
    if (migration.version === MIGRATION_VERSION_1) {
      await seedInitialCatalogue(db);
    }
    version = migration.version;
  }

  return version;
}

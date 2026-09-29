import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'market-mapper.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getNativeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }
  return databasePromise;
}

export async function initializeNativeDatabase(): Promise<void> {
  const db = await getNativeDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'syncing', 'failed', 'conflict')),
      attempt_count INTEGER NOT NULL DEFAULT 0,
      last_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_outbox_status_created
      ON outbox(status, created_at);
  `);
}

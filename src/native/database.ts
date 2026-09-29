import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'market-mapper.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getNativeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  return databasePromise;
}

export async function initializeNativeDatabase(): Promise<void> {
  const db = await getNativeDatabase();
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Import lazily so database creation is complete before repository migrations run.
  const { migrateNativeDatabase } = await import('./migrateDatabase');
  await migrateNativeDatabase();
}

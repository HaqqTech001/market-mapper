import * as SQLite from 'expo-sqlite';
import { setDatabaseAdapter } from '@/src/db/sqlite';
import { ExpoSQLiteAdapter } from './ExpoSQLiteAdapter';

const DATABASE_NAME = 'market-mapper.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let adapterInstalled = false;

export function getNativeDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  return databasePromise;
}

export async function initializeNativeDatabase(): Promise<void> {
  const db = await getNativeDatabase();
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  if (!adapterInstalled) {
    setDatabaseAdapter(new ExpoSQLiteAdapter(db));
    adapterInstalled = true;
  }

  const { migrateNativeDatabase } = await import('./migrateDatabase');
  await migrateNativeDatabase(new ExpoSQLiteAdapter(db));
}

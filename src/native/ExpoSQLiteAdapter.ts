import type { SQLiteDatabase } from 'expo-sqlite';
import type { DatabaseAdapter } from '@/src/db/sqlite';
import { getNativeDatabase } from './database';

type RunResult = { lastInsertRowId: number; changes: number };

export class ExpoSQLiteAdapter implements DatabaseAdapter {
  constructor(private readonly db: SQLiteDatabase) {}

  execAsync(sql: string): Promise<void> {
    return this.db.execAsync(sql);
  }

  async runAsync(sql: string, params: unknown[] = []): Promise<RunResult> {
    const result = await this.db.runAsync(sql, ...(params as SQLite.SQLiteBindValue[]));
    return {
      lastInsertRowId: Number(result.lastInsertRowId ?? 0),
      changes: Number(result.changes ?? 0),
    };
  }

  getAllAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    return this.db.getAllAsync<T>(sql, ...(params as SQLite.SQLiteBindValue[]));
  }

  getFirstAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    return this.db.getFirstAsync<T>(sql, ...(params as SQLite.SQLiteBindValue[]));
  }
}

let adapterPromise: Promise<ExpoSQLiteAdapter> | null = null;

export function getExpoSQLiteAdapter(): Promise<ExpoSQLiteAdapter> {
  if (!adapterPromise) {
    adapterPromise = getNativeDatabase().then((db) => new ExpoSQLiteAdapter(db));
  }
  return adapterPromise;
}

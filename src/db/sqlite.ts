/**
 * SQLite Local Database Foundation
 * Provides unified operational storage with transaction helpers,
 * idempotent migration runner, and inspection utilities.
 */

import {
  DDL_V1,
  MIGRATION_VERSION_1,
  DDL_V2,
  MIGRATION_VERSION_2,
  DDL_V3,
  MIGRATION_VERSION_3,
  DDL_V4,
  MIGRATION_VERSION_4,
  DDL_V5,
  MIGRATION_VERSION_5,
  DDL_V6,
  MIGRATION_VERSION_6,
} from './schema';
import { seedInitialCatalogue } from './seed/catalogueSeed';
import { seedInitialMissions } from './seed/missionSeed';

export interface DatabaseAdapter {
  execAsync: (sql: string) => Promise<void>;
  runAsync: (sql: string, params?: unknown[]) => Promise<{ lastInsertRowId: number; changes: number }>;
  getAllAsync: <T = unknown>(sql: string, params?: unknown[]) => Promise<T[]>;
  getFirstAsync: <T = unknown>(sql: string, params?: unknown[]) => Promise<T | null>;
}

// In-Memory / Web storage adapter for development preview in Vite & tests
export class LocalWebStorageAdapter implements DatabaseAdapter {
  private tables = new Map<string, Map<string, Record<string, unknown>>>();

  constructor() {
    this.restoreFromStorage();
  }

  private restoreFromStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = window.localStorage.getItem('mm_sqlite_tables');
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.keys(parsed).forEach((table) => {
            const tableMap = new Map<string, Record<string, unknown>>();
            Object.entries(parsed[table]).forEach(([id, row]) => {
              tableMap.set(id, row as Record<string, unknown>);
            });
            this.tables.set(table, tableMap);
          });
        }
      }
    } catch {
      // Storage unavailable or blocked
    }
  }

  private persistToStorage() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const obj: Record<string, Record<string, unknown>> = {};
        this.tables.forEach((map, tableName) => {
          obj[tableName] = {};
          map.forEach((row, id) => {
            obj[tableName][id] = row;
          });
        });
        window.localStorage.setItem('mm_sqlite_tables', JSON.stringify(obj));
      }
    } catch {
      // Ignore
    }
  }

  async execAsync(sql: string): Promise<void> {
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      if (stmt.startsWith('CREATE TABLE IF NOT EXISTS')) {
        const match = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        if (match && !this.tables.has(match[1])) {
          this.tables.set(match[1], new Map());
        }
      } else if (stmt.startsWith('ALTER TABLE')) {
        const match = stmt.match(/ALTER TABLE (\w+) ADD COLUMN (\w+)/i);
        if (match) {
          const tableName = match[1];
          const colName = match[2];
          const table = this.tables.get(tableName);
          if (table) {
            table.forEach((row) => {
              if (row[colName] === undefined) {
                row[colName] = null;
              }
            });
          }
        }
      }
    }
    this.persistToStorage();
  }

  private evaluateRowCondition(
    row: Record<string, unknown>,
    cond: string,
    getNextParam: () => unknown
  ): boolean {
    const clean = cond.trim();
    if (!clean) return true;

    // Parenthesized OR: (is_excluded = 0 OR is_excluded IS NULL)
    if (clean.startsWith('(') && clean.endsWith(')')) {
      const inner = clean.slice(1, -1).trim();
      if (/\s+OR\s+/i.test(inner)) {
        const parts = inner.split(/\s+OR\s+/i);
        return parts.some((p) => this.evaluateRowCondition(row, p, getNextParam));
      }
    }

    // IS NULL / IS NOT NULL
    const nullMatch = clean.match(/^(\w+)\s+IS(\s+NOT)?\s+NULL$/i);
    if (nullMatch) {
      const col = nullMatch[1];
      const isNot = Boolean(nullMatch[2]);
      const val = row[col];
      const isNull = val === null || val === undefined;
      return isNot ? !isNull : isNull;
    }

    // IN (...)
    const inMatch = clean.match(/^(\w+)\s+IN\s*\(([^)]+)\)$/i);
    if (inMatch) {
      const col = inMatch[1];
      const inVals = inMatch[2].split(',').map((v) => v.trim().replace(/^['"]|['"]$/g, ''));
      const rowVal = String(row[col] ?? '');
      return inVals.includes(rowVal);
    }

    // LIKE
    const likeMatch = clean.match(/^(\w+)\s+LIKE\s+(\?|'[^']*'|[^ ]+)$/i);
    if (likeMatch) {
      const col = likeMatch[1];
      let pattern: unknown = likeMatch[2];
      if (pattern === '?') {
        pattern = getNextParam();
      } else if (typeof pattern === 'string' && pattern.startsWith("'") && pattern.endsWith("'")) {
        pattern = pattern.slice(1, -1);
      }
      const strVal = String(row[col] ?? '').toLowerCase();
      const cleanPattern = String(pattern ?? '').toLowerCase();
      if (cleanPattern.includes('%')) {
        const regexStr = '^' + cleanPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$';
        try {
          return new RegExp(regexStr, 'i').test(strVal);
        } catch {
          return strVal.includes(cleanPattern.replace(/%/g, ''));
        }
      }
      return strVal === cleanPattern;
    }

    // Comparison: >=, <=, !=, <>, >, <, =
    const compMatch = clean.match(/^(\w+)\s*(>=|<=|!=|<>|>|<|=)\s*(\?|'[^']*'|[^ ]+)$/i);
    if (compMatch) {
      const col = compMatch[1];
      const op = compMatch[2];
      let val: unknown = compMatch[3];
      if (val === '?') {
        val = getNextParam();
      } else if (typeof val === 'string' && val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      } else if (!isNaN(Number(val))) {
        val = Number(val);
      }

      const rowVal = row[col];
      const numRow = Number(rowVal);
      const numVal = Number(val);
      const useNumeric = !isNaN(numRow) && !isNaN(numVal);

      switch (op) {
        case '=':
          return useNumeric ? numRow === numVal : String(rowVal ?? '') === String(val ?? '');
        case '!=':
        case '<>':
          return useNumeric ? numRow !== numVal : String(rowVal ?? '') !== String(val ?? '');
        case '>=':
          return useNumeric ? numRow >= numVal : String(rowVal ?? '') >= String(val ?? '');
        case '<=':
          return useNumeric ? numRow <= numVal : String(rowVal ?? '') <= String(val ?? '');
        case '>':
          return useNumeric ? numRow > numVal : String(rowVal ?? '') > String(val ?? '');
        case '<':
          return useNumeric ? numRow < numVal : String(rowVal ?? '') < String(val ?? '');
      }
    }

    return true;
  }

  async runAsync(sql: string, params: unknown[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    const trimmed = sql.trim();

    // INSERT INTO / INSERT OR REPLACE INTO table (col1, col2, ...) VALUES (?, ...)
    if (trimmed.startsWith('INSERT INTO') || trimmed.startsWith('INSERT OR REPLACE INTO')) {
      const match = trimmed.match(/INSERT (?:OR REPLACE )?INTO (\w+)(?:\s*\(([^)]+)\))?(?:\s*VALUES\s*\(([^)]+)\))?/i);
      if (match) {
        const tableName = match[1];
        const rawCols = match[2];
        const rawVals = match[3];
        let table = this.tables.get(tableName);
        if (!table) {
          table = new Map();
          this.tables.set(tableName, table);
        }

        const valTokens = rawVals ? rawVals.split(',').map((v) => v.trim()) : [];
        let paramIdx = 0;
        const resolvedVals = valTokens.map((t) => {
          if (t === '?') {
            return params[paramIdx++];
          }
          if (t.startsWith("'") && t.endsWith("'")) {
            return t.slice(1, -1);
          }
          if (!isNaN(Number(t))) {
            return Number(t);
          }
          if (t.toUpperCase() === 'NULL') {
            return null;
          }
          return t;
        });

        const row: Record<string, unknown> = {};
        if (rawCols) {
          const cols = rawCols.split(',').map((c) => c.trim());
          cols.forEach((col, idx) => {
            if (resolvedVals.length > idx) {
              row[col] = resolvedVals[idx] !== undefined ? resolvedVals[idx] : null;
            } else {
              row[col] = params[idx] !== undefined ? params[idx] : null;
            }
          });
        } else {
          params.forEach((val, idx) => {
            row[`col_${idx}`] = val;
          });
        }

        const idKey = (row.id as string) || (row.session_id as string) || (row.version ? String(row.version) : `row_${Date.now()}_${Math.random()}`);
        if (!row.id) {
          row.id = idKey;
        }

        table.set(String(idKey), row);
        this.persistToStorage();
        return { lastInsertRowId: 1, changes: 1 };
      }
    }

    // UPDATE table SET col1 = ?, col2 = ? WHERE cond
    if (trimmed.startsWith('UPDATE')) {
      const cleanSql = trimmed.replace(/;+$/, '').trim();
      const match = cleanSql.match(/^UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)(?:\s+WHERE\s+([\s\S]*))?$/i);
      if (match) {
        const tableName = match[1];
        const setClause = match[2];
        const whereClause = match[3];
        const table = this.tables.get(tableName);
        if (!table) return { lastInsertRowId: 0, changes: 0 };

        const setPairs = setClause.split(',').map((s) => s.trim());
        let paramIdx = 0;
        const updates: Record<string, unknown> = {};
        setPairs.forEach((pair) => {
          const parts = pair.split('=');
          const col = parts[0].trim();
          const rawVal = parts[1]?.trim();
          if (rawVal === '?') {
            updates[col] = params[paramIdx++];
          } else if (rawVal && rawVal.startsWith("'") && rawVal.endsWith("'")) {
            updates[col] = rawVal.slice(1, -1);
          } else if (rawVal && !isNaN(Number(rawVal))) {
            updates[col] = Number(rawVal);
          } else if (rawVal && rawVal.toUpperCase() === 'NULL') {
            updates[col] = null;
          } else if (rawVal) {
            updates[col] = rawVal;
          } else {
            updates[col] = params[paramIdx++];
          }
        });

        let changes = 0;
        table.forEach((row, key) => {
          let matches = true;
          if (whereClause) {
            let whereParamIdx = paramIdx;
            const getNextParam = () => params[whereParamIdx++];
            const conditions = whereClause.split(/\s+AND\s+/i);
            for (const cond of conditions) {
              if (!this.evaluateRowCondition(row, cond, getNextParam)) {
                matches = false;
                break;
              }
            }
          }

          if (matches) {
            Object.assign(row, updates);
            table.set(key, row);
            changes++;
          }
        });

        this.persistToStorage();
        return { lastInsertRowId: 0, changes };
      }
    }

    // DELETE FROM table [WHERE col = ?]
    if (trimmed.startsWith('DELETE FROM')) {
      const cleanSql = trimmed.replace(/;+$/, '').trim();
      const match = cleanSql.match(/^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]*))?$/i);
      if (match) {
        const tableName = match[1];
        const whereClause = match[2];
        const table = this.tables.get(tableName);
        if (table) {
          if (!whereClause) {
            const count = table.size;
            table.clear();
            this.persistToStorage();
            return { lastInsertRowId: 0, changes: count };
          } else {
            let deleted = 0;
            for (const [key, row] of Array.from(table.entries())) {
              let matches = true;
              let whereParamIdx = 0;
              const getNextParam = () => params[whereParamIdx++];
              const conditions = whereClause.split(/\s+AND\s+/i);
              for (const cond of conditions) {
                if (!this.evaluateRowCondition(row, cond, getNextParam)) {
                  matches = false;
                  break;
                }
              }

              if (matches) {
                table.delete(key);
                deleted++;
              }
            }
            this.persistToStorage();
            return { lastInsertRowId: 0, changes: deleted };
          }
        }
      }
    }

    return { lastInsertRowId: 0, changes: 0 };
  }

  async getAllAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    const cleanSql = sql.replace(/;+$/, '').trim();
    const match = cleanSql.match(/FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]*?))?(?:\s+ORDER\s+BY\s+([\s\S]*?))?(?:\s+LIMIT\s+(\d+))?$/i);
    if (match) {
      const tableName = match[1];
      const whereClause = match[2]?.trim();
      const orderByClause = match[3]?.trim();
      const limitClause = match[4]?.trim();

      const table = this.tables.get(tableName);
      if (!table) return [];

      let rows = Array.from(table.values());

      // WHERE evaluation
      if (whereClause) {
        const conditions = whereClause.split(/\s+AND\s+/i);
        rows = rows.filter((row) => {
          let whereParamIdx = 0;
          const getNextParam = () => params[whereParamIdx++];
          for (const cond of conditions) {
            if (!this.evaluateRowCondition(row, cond, getNextParam)) {
              return false;
            }
          }
          return true;
        });
      }

      // ORDER BY evaluation
      if (orderByClause) {
        const orderParts = orderByClause.split(',').map((s) => s.trim());
        rows.sort((a, b) => {
          for (const part of orderParts) {
            const [col, dir] = part.split(/\s+/);
            const isDesc = dir && dir.toUpperCase() === 'DESC';
            const valA = a[col] as any;
            const valB = b[col] as any;
            if (valA < valB) return isDesc ? 1 : -1;
            if (valA > valB) return isDesc ? -1 : 1;
          }
          return 0;
        });
      }

      // LIMIT evaluation
      if (limitClause) {
        const limit = parseInt(limitClause, 10);
        rows = rows.slice(0, limit);
      }

      return rows as unknown as T[];
    }
    return [];
  }

  async getFirstAsync<T = unknown>(sql: string, params: unknown[] = []): Promise<T | null> {
    const all = await this.getAllAsync<T>(sql, params);
    return all.length > 0 ? all[0] : null;
  }

  getTableRowCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    this.tables.forEach((map, name) => {
      counts[name] = map.size;
    });
    return counts;
  }

  clearAll() {
    this.tables.clear();
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('mm_sqlite_tables');
      }
    } catch {
      // Ignore
    }
  }
}

// Global Singleton Adapter
let dbAdapter: LocalWebStorageAdapter | null = null;
let isInitialized = false;

export function getDatabase(): DatabaseAdapter {
  if (!dbAdapter) {
    dbAdapter = new LocalWebStorageAdapter();
  }
  return dbAdapter;
}

/**
 * Executes SQLite migrations idempotently and checks schema_migrations
 */
export async function initializeDatabase(): Promise<{
  success: boolean;
  version: number;
  tablesCreated: number;
}> {
  if (isInitialized && dbAdapter) {
    return { success: true, version: MIGRATION_VERSION_2, tablesCreated: DDL_V1.length + DDL_V2.length };
  }

  const db = getDatabase();

  // 1. Check applied migrations
  let existingVersion = 0;
  try {
    const row = await db.getFirstAsync<{ version: number }>(
      `SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;`
    );
    if (row && row.version) {
      existingVersion = Number(row.version);
    }
  } catch {
    // schema_migrations may not exist yet
  }

  // 2. Apply V1 if not yet applied
  if (existingVersion < MIGRATION_VERSION_1) {
    for (const ddl of DDL_V1) {
      await db.execAsync(ddl);
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
      [MIGRATION_VERSION_1, 'initial_v1_schema', new Date().toISOString()]
    );
    await seedInitialCatalogue(db);
  }

  // 3. Apply V2 (Phase 3: Path Recording & Multi-Segment Location Engine)
  if (existingVersion < MIGRATION_VERSION_2) {
    for (const ddl of DDL_V2) {
      await db.execAsync(ddl);
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
      [MIGRATION_VERSION_2, 'v2_path_recording_engine', new Date().toISOString()]
    );
  }

  // 4. Apply V3 (Phase 4: Business Capture, Offers, Media & Rapid Mapping)
  if (existingVersion < MIGRATION_VERSION_3) {
    for (const ddl of DDL_V3) {
      await db.execAsync(ddl);
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
      [MIGRATION_VERSION_3, 'v3_business_capture_and_media', new Date().toISOString()]
    );
  }

  // 5. Apply V4 (Phase 5: Missions, Team Coordination, Notifications, Handover & Operational Chat)
  if (existingVersion < MIGRATION_VERSION_4) {
    for (const ddl of DDL_V4) {
      await db.execAsync(ddl);
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
      [MIGRATION_VERSION_4, 'v4_team_coordination_and_chat', new Date().toISOString()]
    );
    await seedInitialMissions(db);
  }

  // 6. Apply V5 (Phase 5: Junction Types & Business Relative Positions)
  if (existingVersion < MIGRATION_VERSION_5) {
    for (const ddl of DDL_V5) {
      await db.execAsync(ddl);
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
      [MIGRATION_VERSION_5, 'v5_junction_types_and_relative_positions', new Date().toISOString()]
    );
  }

  // 7. Apply V6 (Phase 5 Productionization: Junction Branch Tracking)
  if (existingVersion < MIGRATION_VERSION_6) {
    for (const ddl of DDL_V6) {
      await db.execAsync(ddl);
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
      [MIGRATION_VERSION_6, 'v6_junction_branch_tracking', new Date().toISOString()]
    );
  }

  // Ensure initial operational missions and seed data are populated
  await seedInitialMissions(db);

  isInitialized = true;
  return {
    success: true,
    version: MIGRATION_VERSION_6,
    tablesCreated: DDL_V1.length + DDL_V2.length + DDL_V3.length + DDL_V4.length + DDL_V5.length + DDL_V6.length,
  };
}

/**
 * Returns database table counts and operational health for the Offline Data screen
 */
export async function getDatabaseStats(): Promise<{
  version: number;
  totalTables: number;
  businessesCount: number;
  pathsCount: number;
  pendingOutboxCount: number;
  pendingMediaUploadCount: number;
  revisitsCount: number;
  catalogueCount: number;
  missionsCount: number;
  handoversCount: number;
  fieldIssuesCount: number;
  chatMessagesCount: number;
  notificationsCount: number;
}> {
  const db = getDatabase();
  const counts = db instanceof LocalWebStorageAdapter ? db.getTableRowCounts() : {};

  return {
    version: MIGRATION_VERSION_4,
    totalTables: DDL_V1.length + DDL_V2.length + DDL_V3.length + DDL_V4.length,
    businessesCount: counts['local_businesses'] || 0,
    pathsCount: counts['local_paths'] || 0,
    pendingOutboxCount: counts['local_outbox_queue'] || 0,
    pendingMediaUploadCount: counts['local_media_upload_queue'] || 0,
    revisitsCount: counts['local_revisits'] || counts['local_business_revisits'] || 0,
    catalogueCount: counts['local_catalogue_items'] || 0,
    missionsCount: counts['local_missions'] || 0,
    handoversCount: counts['local_handovers'] || 0,
    fieldIssuesCount: counts['local_field_issues'] || 0,
    chatMessagesCount: counts['local_chat_messages'] || 0,
    notificationsCount: counts['local_notifications'] || 0,
  };
}

/**
 * Development database reset helper
 */
export async function resetDatabase(): Promise<void> {
  if (dbAdapter instanceof LocalWebStorageAdapter) {
    dbAdapter.clearAll();
  }
  isInitialized = false;
  await initializeDatabase();
}


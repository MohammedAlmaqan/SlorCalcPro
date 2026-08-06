/**
 * Minimal async SQLite surface used by the data layer.
 *
 * Production uses expo-sqlite's `SQLiteDatabase`; tests use an in-memory
 * `node:sqlite` adapter. Both implement this interface so repos stay
 * platform-agnostic and fully unit-testable without a native module.
 */

export type SqlBindValue = number | string | null | Uint8Array;

export type SqlBindParams = readonly SqlBindValue[] | Record<string, SqlBindValue>;

export interface SqlResult {
  /** Rowid of the last successful insert. */
  lastInsertRowId: number;
  /** Number of rows affected. */
  changes: number;
}

export interface DatabaseLike {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, params?: SqlBindParams): Promise<SqlResult>;
  getFirstAsync<T>(source: string, params?: SqlBindParams): Promise<T | null>;
  getAllAsync<T>(source: string, params?: SqlBindParams): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
  /** Exclusive transaction; queries must be run on the provided `txn`. */
  withExclusiveTransactionAsync(task: (txn: DatabaseLike) => Promise<void>): Promise<void>;
}

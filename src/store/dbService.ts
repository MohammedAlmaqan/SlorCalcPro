import type { DatabaseLike } from '../db/types';

let db: DatabaseLike | null = null;

/** Bind the initialized database once at app startup. */
export function setDbService(database: DatabaseLike): void {
  db = database;
}

/** Access the initialized database. Throws if `initDatabase()` has not run. */
export function getDbService(): DatabaseLike {
  if (!db) throw new Error('Database not initialized');
  return db;
}

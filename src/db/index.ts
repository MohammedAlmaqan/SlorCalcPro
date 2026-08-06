import { openDatabaseAsync } from 'expo-sqlite';
import { toDatabaseLike } from './expoSqliteAdapter';
import { CURRENT_SCHEMA_VERSION, migrate } from './migrate';
import { settingsRepo } from './repos/settings';
import { seed } from './seed';
import type { DatabaseLike } from './types';

export const DB_NAME = 'solarcalcpro.db';

/** Marker key used to seed reference data exactly once per install. */
const SEED_MARKER_KEY = 'meta.seed_version';

let cached: DatabaseLike | null = null;

/**
 * Open (or reuse) the app database, applying migrations and one-time seeds.
 * Call once at app startup via `initDatabase()`.
 */
export async function getDb(): Promise<DatabaseLike> {
  if (cached) return cached;
  const raw = await openDatabaseAsync(DB_NAME);
  const db = toDatabaseLike(raw);
  await migrate(db);

  const settings = settingsRepo(db);
  const seeded = await settings.get(SEED_MARKER_KEY);
  if (seeded === null) {
    await seed(db);
    await settings.set(SEED_MARKER_KEY, String(CURRENT_SCHEMA_VERSION));
  }

  cached = db;
  return db;
}

/** Async DB bootstrap for the app root layout. */
export async function initDatabase(): Promise<DatabaseLike> {
  return getDb();
}

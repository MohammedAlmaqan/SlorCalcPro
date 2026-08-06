import { MIGRATIONS } from './schema';
import type { DatabaseLike } from './types';

export const CURRENT_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/**
 * Apply pending migrations. Idempotent — safe to call on every app start.
 */
export async function migrate(db: DatabaseLike): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  if (current >= CURRENT_SCHEMA_VERSION) return;

  await db.withExclusiveTransactionAsync(async (txn) => {
    for (const migration of MIGRATIONS) {
      if (migration.version <= current) continue;
      await txn.execAsync(migration.up);
      await txn.execAsync(`PRAGMA user_version = ${migration.version}`);
    }
  });
}

export async function schemaVersion(db: DatabaseLike): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

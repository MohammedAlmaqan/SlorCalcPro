import { migrate } from '../../migrate';
import { seed } from '../../seed';
import type { DatabaseLike } from '../../types';
import { openMemoryDb } from './nodeDb';

/** Fresh migrated + seeded in-memory database for a test. */
export async function openTestDb(): Promise<DatabaseLike> {
  const db = openMemoryDb();
  await migrate(db);
  await seed(db);
  return db;
}

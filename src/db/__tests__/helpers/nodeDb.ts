import { DatabaseSync } from 'node:sqlite';
import type { DatabaseLike, SqlBindParams, SqlResult } from '../../types';

type NodeBindValue = number | string | null | Uint8Array;

type PositionalArgs = NodeBindValue[];
type NamedArgs = Record<string, NodeBindValue>;

function isPositional(args: PositionalArgs | NamedArgs): args is PositionalArgs {
  return Array.isArray(args);
}

function bindArgs(params?: SqlBindParams): PositionalArgs | NamedArgs | undefined {
  if (params === undefined) return undefined;
  if (Array.isArray(params)) return [...params];
  const named: Record<string, NodeBindValue> = {};
  for (const [key, value] of Object.entries(params)) {
    named[key.replace(/^[:\$@]/, '')] = value;
  }
  return named;
}

const toResult = (r: {
  lastInsertRowid: number | bigint;
  changes: number | bigint;
}): SqlResult => ({
  lastInsertRowId: Number(r.lastInsertRowid),
  changes: Number(r.changes),
});

/**
 * In-memory SQLite adapter backed by Node's built-in `node:sqlite`.
 * Test-only: it must never be imported from app code (node built-in would
 * break Metro bundling).
 */
export function openMemoryDb(): DatabaseLike {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');

  const adapter: DatabaseLike = {
    execAsync: async (source) => {
      db.exec(source);
    },
    runAsync: async (source, params) => {
      const args = bindArgs(params);
      if (args === undefined) return toResult(db.prepare(source).run());
      const stmt = db.prepare(source);
      return isPositional(args) ? toResult(stmt.run(...args)) : toResult(stmt.run(args));
    },
    getFirstAsync: async (source, params) => {
      const args = bindArgs(params);
      if (args === undefined) {
        return (db.prepare(source).get() ?? null) as never;
      }
      const stmt = db.prepare(source);
      return ((isPositional(args) ? stmt.get(...args) : stmt.get(args)) ?? null) as never;
    },
    getAllAsync: async (source, params) => {
      const args = bindArgs(params);
      if (args === undefined) {
        return db.prepare(source).all() as never;
      }
      const stmt = db.prepare(source);
      return (isPositional(args) ? stmt.all(...args) : stmt.all(args)) as never;
    },
    withTransactionAsync: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
    withExclusiveTransactionAsync: async (task) => {
      db.exec('BEGIN IMMEDIATE');
      try {
        await task(adapter);
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };

  return adapter;
}

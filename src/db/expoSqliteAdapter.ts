import type { SQLiteBindParams, SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';
import type { DatabaseLike, SqlBindParams } from './types';

function toExpoParams(params?: SqlBindParams): SQLiteBindParams | undefined {
  if (params === undefined) return undefined;
  if (Array.isArray(params)) {
    return params as SQLiteBindValue[];
  }
  return params as Record<string, SQLiteBindValue>;
}

/** Wrap an expo-sqlite `SQLiteDatabase` as a `DatabaseLike`. */
export function toDatabaseLike(db: SQLiteDatabase): DatabaseLike {
  return {
    execAsync: (source) => db.execAsync(source),
    runAsync: (source, params) => {
      const bound = toExpoParams(params);
      return bound ? db.runAsync(source, bound) : db.runAsync(source);
    },
    getFirstAsync: (source, params) => {
      const bound = toExpoParams(params);
      return bound ? db.getFirstAsync(source, bound) : db.getFirstAsync(source);
    },
    getAllAsync: (source, params) => {
      const bound = toExpoParams(params);
      return bound ? db.getAllAsync(source, bound) : db.getAllAsync(source);
    },
    withTransactionAsync: (task) => db.withTransactionAsync(task),
    withExclusiveTransactionAsync: (task) =>
      db.withExclusiveTransactionAsync(async (txn) => task(toDatabaseLike(txn))),
  };
}

import type { DatabaseLike } from '../types';

export interface SettingsRepo {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  getNumber(key: string): Promise<number | null>;
  setNumber(key: string, value: number): Promise<void>;
  getBoolean(key: string): Promise<boolean | null>;
  setBoolean(key: string, value: boolean): Promise<void>;
  remove(key: string): Promise<void>;
}

export function settingsRepo(db: DatabaseLike): SettingsRepo {
  const get = async (key: string): Promise<string | null> => {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  };

  const set = async (key: string, value: string): Promise<void> => {
    await db.runAsync(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    );
  };

  return {
    get,
    set,
    getNumber: async (key) => {
      const value = await get(key);
      if (value === null) return null;
      const n = Number(value);
      return Number.isNaN(n) ? null : n;
    },
    setNumber: async (key, value) => {
      await set(key, String(value));
    },
    getBoolean: async (key) => {
      const value = await get(key);
      return value === null ? null : value === 'true';
    },
    setBoolean: async (key, value) => {
      await set(key, value ? 'true' : 'false');
    },
    remove: async (key) => {
      await db.runAsync('DELETE FROM settings WHERE key = ?', [key]);
    },
  };
}

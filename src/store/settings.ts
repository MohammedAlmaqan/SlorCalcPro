import { create } from 'zustand';

import { settingsRepo } from '../db/repos/settings';
import { getDbService } from './dbService';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_KEY = 'ui.theme_mode';

interface SettingsState {
  loaded: boolean;
  themeMode: ThemeMode;
  load: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  loaded: false,
  themeMode: 'system',

  load: async () => {
    const repo = settingsRepo(getDbService());
    const stored = await repo.get(THEME_KEY);
    const themeMode: ThemeMode = stored === 'light' || stored === 'dark' ? stored : 'system';
    set({ loaded: true, themeMode });
  },

  setThemeMode: async (mode) => {
    await settingsRepo(getDbService()).set(THEME_KEY, mode);
    set({ themeMode: mode });
  },
}));

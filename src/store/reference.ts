import { create } from 'zustand';

import type { AppliancePreset, PshLocation } from '../data/types';
import { presetRepo } from '../db/repos/presets';
import { pshRepo } from '../db/repos/psh';
import { getDbService } from './dbService';

interface ReferenceState {
  psh: PshLocation[];
  presets: AppliancePreset[];
  loaded: boolean;

  load: () => Promise<void>;
  searchPsh: (query: string, limit?: number) => Promise<PshLocation[]>;
  addPshManual: (entry: Omit<PshLocation, 'id' | 'isManual'>) => Promise<PshLocation>;
  searchPresets: (query: string, limit?: number) => Promise<AppliancePreset[]>;
}

export const useReferenceStore = create<ReferenceState>((set) => ({
  psh: [],
  presets: [],
  loaded: false,

  load: async () => {
    const [psh, presets] = await Promise.all([
      pshRepo(getDbService()).all(),
      presetRepo(getDbService()).all(),
    ]);
    set({ psh, presets, loaded: true });
  },

  searchPsh: async (query, limit) => {
    const items = await pshRepo(getDbService()).search(query, limit);
    set({ psh: items });
    return items;
  },

  addPshManual: async (entry) => {
    const item = await pshRepo(getDbService()).addManual(entry);
    set((state) => ({ psh: [...state.psh, item] }));
    return item;
  },

  searchPresets: async (query, limit) => {
    const items = await presetRepo(getDbService()).search(query, limit);
    set({ presets: items });
    return items;
  },
}));

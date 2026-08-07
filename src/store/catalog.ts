import { create } from 'zustand';

import type { ComponentKind, ComponentRecord } from '../data/types';
import { catalogRepo, type AnySpec, type SpecByKind } from '../db/repos/catalog';
import { getDbService } from './dbService';

type ListByKind = Partial<Record<ComponentKind, ComponentRecord<AnySpec>[]>>;

interface CatalogState {
  lists: ListByKind;
  favorites: ComponentRecord<AnySpec>[];
  loadingKind: ComponentKind | null;

  loadKind: <K extends ComponentKind>(kind: K) => Promise<ComponentRecord<SpecByKind[K]>[]>;
  search: <K extends ComponentKind>(
    kind: K,
    query: string,
    limit?: number,
  ) => Promise<ComponentRecord<SpecByKind[K]>[]>;
  toggleFavorite: (id: string, favorite: boolean) => Promise<void>;
  remove: (kind: ComponentKind, id: string) => Promise<void>;
}

function repo() {
  return catalogRepo(getDbService());
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  lists: {},
  favorites: [],
  loadingKind: null,

  loadKind: async (kind) => {
    set({ loadingKind: kind });
    try {
      const items = await repo().list(kind);
      set((state) => ({ lists: { ...state.lists, [kind]: items } }));
      return items;
    } finally {
      set({ loadingKind: null });
    }
  },

  search: async (kind, query, limit) => {
    const items = await repo().search(kind, query, limit);
    set((state) => ({ lists: { ...state.lists, [kind]: items } }));
    return items;
  },

  toggleFavorite: async (id, favorite) => {
    await repo().setFavorite(id, favorite);
    const { lists, favorites } = get();
    set({
      lists: Object.fromEntries(
        Object.entries(lists).map(([k, items]) => [
          k,
          (items as ComponentRecord<AnySpec>[]).map((item) =>
            item.id === id ? { ...item, isFavorite: favorite } : item,
          ),
        ]),
      ) as ListByKind,
      favorites: favorites.map((item) =>
        item.id === id ? { ...item, isFavorite: favorite } : item,
      ),
    });
    if (favorite) {
      const updated = await repo().listFavorites();
      set({ favorites: updated });
    } else {
      set({ favorites: favorites.filter((item) => item.id !== id) });
    }
  },

  remove: async (kind, id) => {
    await repo().remove(kind, id);
    set((state) => ({
      lists: {
        ...state.lists,
        [kind]: (state.lists[kind] ?? []).filter((item) => item.id !== id),
      },
      favorites: state.favorites.filter((item) => item.id !== id),
    }));
  },
}));

import {create} from 'zustand';

import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

interface FavoritesState {
  items: FileSystemNode[];
  isLoading: boolean;
  removedItemIds: string[];
  setItems: (items: FileSystemNode[]) => void;
  setLoading: (value: boolean) => void;
  removeFavorite: (itemId: string) => void;
  restoreFavorite: (item: FileSystemNode) => void;
}

export const useFavoritesStore = create<FavoritesState>(set => ({
  items: [],
  isLoading: false,
  removedItemIds: [],
  setItems: items =>
    set(state => ({
      items: items.filter(item => !state.removedItemIds.includes(item.id)),
    })),
  setLoading: isLoading => set({isLoading}),
  removeFavorite: itemId =>
    set(state => ({
      items: state.items.filter(item => item.id !== itemId),
      removedItemIds: state.removedItemIds.includes(itemId)
        ? state.removedItemIds
        : [...state.removedItemIds, itemId],
    })),
  restoreFavorite: item =>
    set(state => ({
      items: state.items.some(currentItem => currentItem.id === item.id)
        ? state.items
        : [item, ...state.items],
      removedItemIds: state.removedItemIds.filter(id => id !== item.id),
    })),
}));

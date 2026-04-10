import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

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

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    set => ({
      items: [],
      isLoading: false,
      removedItemIds: [],
      setItems: items =>
        set(state => {
          const visibleIncomingItems = items.filter(
            item => !state.removedItemIds.includes(item.id),
          );
          const localOnlyItems = state.items.filter(
            currentItem =>
              !visibleIncomingItems.some(item => item.id === currentItem.id) &&
              !state.removedItemIds.includes(currentItem.id),
          );

          return {
            items: [...localOnlyItems, ...visibleIncomingItems],
          };
        }),
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
    }),
    {
      name: 'favorite-items',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        items: state.items,
        removedItemIds: state.removedItemIds,
      }),
    },
  ),
);

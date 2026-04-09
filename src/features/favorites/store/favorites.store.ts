import {create} from 'zustand';

import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

interface FavoritesState {
  items: FileSystemNode[];
  isLoading: boolean;
  setItems: (items: FileSystemNode[]) => void;
  setLoading: (value: boolean) => void;
}

export const useFavoritesStore = create<FavoritesState>(set => ({
  items: [],
  isLoading: false,
  setItems: items => set({items}),
  setLoading: isLoading => set({isLoading}),
}));


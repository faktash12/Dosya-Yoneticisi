import {create} from 'zustand';

import type {
  CloudItem,
  CloudProviderId,
  CloudProviderSummary,
} from '@/domain/entities/CloudProvider';

interface CloudState {
  providers: CloudProviderSummary[];
  activeProviderId: CloudProviderId | null;
  activeItems: CloudItem[];
  activeFolderId: string | null;
  activePath: string;
  nextCursor: string | null;
  isLoading: boolean;
  errorMessage: string | null;
  hydrate: (providers: CloudProviderSummary[]) => void;
  updateProvider: (provider: CloudProviderSummary) => void;
  openFolder: (input: {
    providerId: CloudProviderId;
    folderId?: string | null;
    path?: string;
  }) => void;
  setItems: (items: CloudItem[], nextCursor?: string | null) => void;
  appendItems: (items: CloudItem[], nextCursor?: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  resetBrowser: () => void;
}

export const useCloudStore = create<CloudState>(set => ({
  providers: [],
  activeProviderId: null,
  activeItems: [],
  activeFolderId: null,
  activePath: '/',
  nextCursor: null,
  isLoading: false,
  errorMessage: null,
  hydrate: providers => set({providers}),
  updateProvider: provider =>
    set(state => ({
      providers: state.providers.map(current =>
        current.providerId === provider.providerId ? provider : current,
      ),
    })),
  openFolder: input =>
    set({
      activeProviderId: input.providerId,
      activeFolderId: input.folderId ?? null,
      activePath: input.path ?? '/',
      activeItems: [],
      nextCursor: null,
      isLoading: true,
      errorMessage: null,
    }),
  setItems: (items, nextCursor = null) =>
    set({
      activeItems: items,
      nextCursor,
      isLoading: false,
      errorMessage: null,
    }),
  appendItems: (items, nextCursor = null) =>
    set(state => ({
      activeItems: [...state.activeItems, ...items],
      nextCursor,
      isLoading: false,
      errorMessage: null,
    })),
  setLoading: isLoading => set({isLoading}),
  setErrorMessage: errorMessage => set({errorMessage, isLoading: false}),
  resetBrowser: () =>
    set({
      activeProviderId: null,
      activeItems: [],
      activeFolderId: null,
      activePath: '/',
      nextCursor: null,
      isLoading: false,
      errorMessage: null,
    }),
}));

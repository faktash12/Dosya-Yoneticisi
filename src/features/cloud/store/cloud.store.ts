import {create} from 'zustand';

import type {CloudProviderSummary} from '@/domain/entities/CloudProvider';

interface CloudState {
  providers: CloudProviderSummary[];
  hydrate: (providers: CloudProviderSummary[]) => void;
}

export const useCloudStore = create<CloudState>(set => ({
  providers: [],
  hydrate: providers => set({providers}),
}));

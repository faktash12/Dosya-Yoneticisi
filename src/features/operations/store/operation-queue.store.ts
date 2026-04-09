import {create} from 'zustand';

import type {OperationJob} from '@/domain/entities/OperationJob';

interface OperationQueueState {
  jobs: OperationJob[];
  hydrate: (jobs: OperationJob[]) => void;
}

export const useOperationQueueStore = create<OperationQueueState>(set => ({
  jobs: [],
  hydrate: jobs => set({jobs}),
}));


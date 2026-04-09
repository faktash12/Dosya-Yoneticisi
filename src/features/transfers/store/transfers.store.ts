import {create} from 'zustand';

import type {OperationJob} from '@/domain/entities/OperationJob';

interface TransfersState {
  activeJobs: OperationJob[];
  historyJobs: OperationJob[];
  hydrateFromJobs: (jobs: OperationJob[]) => void;
}

export const useTransfersStore = create<TransfersState>(set => ({
  activeJobs: [],
  historyJobs: [],
  hydrateFromJobs: jobs =>
    set({
      activeJobs: jobs.filter(
        job => job.status === 'pending' || job.status === 'running',
      ),
      historyJobs: jobs.filter(
        job =>
          job.status === 'completed' ||
          job.status === 'failed' ||
          job.status === 'cancelled',
      ),
    }),
}));

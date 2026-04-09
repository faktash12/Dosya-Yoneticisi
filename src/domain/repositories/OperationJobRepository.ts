import type {OperationJob} from '@/domain/entities/OperationJob';
import type {OperationError} from '@/domain/entities/OperationError';

export interface OperationJobRepository {
  enqueue(job: OperationJob): Promise<void>;
  enqueueMany(jobs: OperationJob[]): Promise<void>;
  updateStatus(jobId: string, status: OperationJob['status']): Promise<void>;
  updateProgress(jobId: string, progress: OperationJob['progress']): Promise<void>;
  attachError(jobId: string, error: OperationError): Promise<void>;
  incrementAttempt(jobId: string): Promise<void>;
  getById(jobId: string): Promise<OperationJob | undefined>;
  getNextPending(): Promise<OperationJob | undefined>;
  listJobs(): Promise<OperationJob[]>;
  subscribe(listener: (jobs: OperationJob[]) => void): () => void;
}


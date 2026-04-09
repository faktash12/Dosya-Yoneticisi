import type {
  OperationJob,
  OperationProgress,
} from '@/domain/entities/OperationJob';
import type {OperationError} from '@/domain/entities/OperationError';

export interface OperationExecutionCallbacks {
  onStarted: (jobId: string) => void | Promise<void>;
  onProgress: (
    jobId: string,
    progress: OperationProgress,
  ) => void | Promise<void>;
  onCompleted: (jobId: string) => void | Promise<void>;
  onFailed: (jobId: string, error: OperationError) => void | Promise<void>;
}

export interface OperationExecutor {
  supports(job: OperationJob): boolean;
  execute(
    job: OperationJob,
    callbacks: OperationExecutionCallbacks,
  ): Promise<void>;
  cancel(jobId: string): Promise<void>;
}

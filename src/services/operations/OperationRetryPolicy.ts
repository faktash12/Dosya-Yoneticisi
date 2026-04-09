import type {OperationError} from '@/domain/entities/OperationError';
import type {OperationJob} from '@/domain/entities/OperationJob';

export class OperationRetryPolicy {
  shouldRetry(job: OperationJob, error: OperationError): boolean {
    if (!error.recoverable) {
      return false;
    }

    return job.attemptCount < job.maxAttempts;
  }
}


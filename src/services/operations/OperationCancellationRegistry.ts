import type {OperationExecutor} from '@/domain/repositories/OperationExecutor';

interface RegisteredCancellation {
  executor: OperationExecutor;
  jobId: string;
}

export class OperationCancellationRegistry {
  private readonly registry = new Map<string, RegisteredCancellation>();

  register(jobId: string, executor: OperationExecutor): void {
    this.registry.set(jobId, {executor, jobId});
  }

  unregister(jobId: string): void {
    this.registry.delete(jobId);
  }

  async cancel(jobId: string): Promise<boolean> {
    const entry = this.registry.get(jobId);

    if (!entry) {
      return false;
    }

    await entry.executor.cancel(jobId);
    return true;
  }
}


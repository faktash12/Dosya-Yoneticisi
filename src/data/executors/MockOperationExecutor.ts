import type {OperationError} from '@/domain/entities/OperationError';
import type {
  OperationJob,
  OperationProgress,
} from '@/domain/entities/OperationJob';
import type {
  OperationExecutionCallbacks,
  OperationExecutor,
} from '@/domain/repositories/OperationExecutor';

interface PendingCancellation {
  cancelled: boolean;
}

const wait = async (durationMs: number): Promise<void> => {
  await new Promise<void>(resolve => setTimeout(resolve, durationMs));
};

export class MockOperationExecutor implements OperationExecutor {
  private readonly cancellations = new Map<string, PendingCancellation>();

  supports(_job: OperationJob): boolean {
    return true;
  }

  async execute(
    job: OperationJob,
    callbacks: OperationExecutionCallbacks,
  ): Promise<void> {
    const cancellation = {cancelled: false};
    this.cancellations.set(job.id, cancellation);
    await callbacks.onStarted(job.id);

    const steps = Math.max(job.sourceItems.length, 1) * 4;

    for (let index = 1; index <= steps; index += 1) {
      await wait(220);

      if (cancellation.cancelled) {
        const error: OperationError = {
          code: 'OPERATION_CANCELLED',
          category: 'cancelled',
          message: 'Islem kullanici tarafindan iptal edildi.',
          recoverable: false,
        };

        await callbacks.onFailed(job.id, error);
        this.cancellations.delete(job.id);
        return;
      }

      if (
        job.type === 'delete' &&
        index === steps &&
        job.sourceItems.some(item => item.displayName.toLowerCase().includes('tax'))
      ) {
        const error: OperationError = {
          code: 'MOCK_DELETE_CONFLICT',
          category: 'conflict',
          message: 'Bazi ogeler silinemedi. Mock catismasi olustu.',
          recoverable: true,
        };

        await callbacks.onFailed(job.id, error);
        this.cancellations.delete(job.id);
        return;
      }

      const progress: OperationProgress = {
        totalUnits: steps,
        completedUnits: index,
        percentage: Math.round((index / steps) * 100),
        startedAt: job.progress.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const currentItemName =
        job.sourceItems[Math.min(index - 1, job.sourceItems.length - 1)]
          ?.displayName ?? job.sourceItems[0]?.displayName;

      if (currentItemName) {
        progress.currentItemName = currentItemName;
      }

      await callbacks.onProgress(job.id, progress);
    }

    await callbacks.onCompleted(job.id);
    this.cancellations.delete(job.id);
  }

  async cancel(jobId: string): Promise<void> {
    const entry = this.cancellations.get(jobId);

    if (entry) {
      entry.cancelled = true;
    }
  }
}

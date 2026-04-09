import {createOperationJobId, type OperationJob} from '@/domain/entities/OperationJob';
import type {OperationError} from '@/domain/entities/OperationError';
import type {OperationJobRepository} from '@/domain/repositories/OperationJobRepository';
import type {OperationExecutorRegistry} from '@/data/executors/OperationExecutorRegistry';
import {appLogger} from '@/services/logging/AppLogger';
import type {OperationCancellationRegistry} from '@/services/operations/OperationCancellationRegistry';
import type {OperationClipboardService} from '@/services/operations/OperationClipboardService';
import type {OperationRetryPolicy} from '@/services/operations/OperationRetryPolicy';

export class OperationQueueProcessor {
  private isProcessing = false;

  constructor(
    private readonly repository: OperationJobRepository,
    private readonly executorRegistry: OperationExecutorRegistry,
    private readonly retryPolicy: OperationRetryPolicy,
    private readonly cancellationRegistry: OperationCancellationRegistry,
    private readonly clipboardService: OperationClipboardService,
  ) {}

  async enqueue(job: OperationJob): Promise<void> {
    await this.repository.enqueue(job);
    void this.processNext();
  }

  async enqueueMany(jobs: OperationJob[]): Promise<void> {
    await this.repository.enqueueMany(jobs);
    void this.processNext();
  }

  async retry(jobId: string): Promise<string | null> {
    const job = await this.repository.getById(jobId);

    if (!job || job.status !== 'failed') {
      return null;
    }

    const retryJob: OperationJob = {
      id: createOperationJobId(),
      type: job.type,
      status: 'pending',
      sourceItems: job.sourceItems,
      attemptCount: 0,
      maxAttempts: job.maxAttempts,
      priority: job.priority,
      conflictStrategy: job.conflictStrategy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      progress: {
        totalUnits: job.progress.totalUnits,
        completedUnits: 0,
        percentage: 0,
      },
    };

    if (job.destination) {
      retryJob.destination = job.destination;
    }

    if (job.metadata) {
      retryJob.metadata = {
        ...job.metadata,
        retriedFromJobId: job.id,
      };
    } else {
      retryJob.metadata = {
        retriedFromJobId: job.id,
      };
    }

    await this.enqueue(retryJob);
    return retryJob.id;
  }

  async cancel(jobId: string): Promise<void> {
    const job = await this.repository.getById(jobId);

    if (!job) {
      return;
    }

    if (job.status === 'pending') {
      await this.repository.updateStatus(jobId, 'cancelled');
      return;
    }

    if (job.status === 'running') {
      const cancelled = await this.cancellationRegistry.cancel(jobId);

      if (!cancelled) {
        await this.repository.attachError(jobId, {
          code: 'CANCEL_NOT_AVAILABLE',
          category: 'unknown',
          message: 'Calisan islem iptal edilemedi.',
          recoverable: true,
        });
      }
    }
  }

  async listJobs(): Promise<OperationJob[]> {
    return this.repository.listJobs();
  }

  subscribe(listener: (jobs: OperationJob[]) => void): () => void {
    return this.repository.subscribe(listener);
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      let nextJob = await this.repository.getNextPending();

      while (nextJob) {
        await this.runJob(nextJob);
        nextJob = await this.repository.getNextPending();
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async runJob(job: OperationJob): Promise<void> {
    const executor = this.executorRegistry.resolve(job);

    await this.repository.incrementAttempt(job.id);
    this.cancellationRegistry.register(job.id, executor);

    try {
      await executor.execute(job, {
        onStarted: async startedJobId => {
          await this.repository.updateStatus(startedJobId, 'running');
          appLogger.info({
            scope: 'OperationQueueProcessor',
            message: 'Operation started',
            data: {jobId: startedJobId, type: job.type},
          });
        },
        onProgress: async (progressJobId, progress) => {
          await this.repository.updateProgress(progressJobId, progress);
        },
        onCompleted: async completedJobId => {
          const completedProgress: OperationJob['progress'] = {
            totalUnits: job.progress.totalUnits,
            completedUnits: job.progress.totalUnits,
            percentage: 100,
            startedAt: job.progress.startedAt ?? new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          const currentItemName = job.sourceItems.at(-1)?.displayName;

          if (currentItemName) {
            completedProgress.currentItemName = currentItemName;
          }

          await this.repository.updateStatus(completedJobId, 'completed');
          await this.repository.updateProgress(completedJobId, completedProgress);

          if (
            job.type === 'move' &&
            job.metadata?.clipboardBufferId &&
            job.metadata.origin === 'clipboard-paste'
          ) {
            this.clipboardService.clearIfMatches(
              String(job.metadata.clipboardBufferId),
            );
          }
        },
        onFailed: async (failedJobId, error) => {
          await this.handleFailure(failedJobId, error);
        },
      });
    } finally {
      this.cancellationRegistry.unregister(job.id);
    }
  }

  private async handleFailure(
    jobId: string,
    error: OperationError,
  ): Promise<void> {
    const job = await this.repository.getById(jobId);

    if (!job) {
      return;
    }

    await this.repository.attachError(jobId, error);

    if (error.category === 'cancelled') {
      await this.repository.updateStatus(jobId, 'cancelled');
      return;
    }

    if (this.retryPolicy.shouldRetry(job, error)) {
      await this.repository.updateStatus(jobId, 'pending');
      await this.repository.updateProgress(jobId, {
        totalUnits: job.progress.totalUnits,
        completedUnits: 0,
        percentage: 0,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    await this.repository.updateStatus(jobId, 'failed');
  }
}

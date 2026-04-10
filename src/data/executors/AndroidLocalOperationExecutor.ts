import {Platform} from 'react-native';

import type {OperationError} from '@/domain/entities/OperationError';
import type {
  OperationJob,
  OperationProgress,
} from '@/domain/entities/OperationJob';
import type {
  OperationExecutionCallbacks,
  OperationExecutor,
} from '@/domain/repositories/OperationExecutor';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';

const createProgress = (
  job: OperationJob,
  completedUnits: number,
  currentItemName?: string,
): OperationProgress => ({
  totalUnits: Math.max(job.sourceItems.length, 1),
  completedUnits,
  percentage: Math.round(
    (completedUnits / Math.max(job.sourceItems.length, 1)) * 100,
  ),
  ...(currentItemName ? {currentItemName} : {}),
  startedAt: job.progress.startedAt ?? new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export class AndroidLocalOperationExecutor implements OperationExecutor {
  supports(job: OperationJob): boolean {
    return (
      Platform.OS === 'android' &&
      (job.type === 'copy' || job.type === 'move') &&
      job.sourceItems.every(item => item.providerId === 'local') &&
      job.destination?.providerId === 'local'
    );
  }

  async execute(
    job: OperationJob,
    callbacks: OperationExecutionCallbacks,
  ): Promise<void> {
    if (!job.destination) {
      const error: OperationError = {
        code: 'LOCAL_OPERATION_DESTINATION_REQUIRED',
        category: 'unsupported',
        message: 'Kopyalama ve taşıma için hedef klasör gerekli.',
        recoverable: false,
        providerId: 'local',
      };
      await callbacks.onFailed(job.id, error);
      return;
    }

    await callbacks.onStarted(job.id);

    try {
      let completedUnits = 0;

      for (const sourceItem of job.sourceItems) {
        if (job.type === 'copy') {
          await localFileSystemBridge.copyEntry(
            sourceItem.path,
            job.destination.path,
            job.conflictStrategy,
          );
        } else {
          await localFileSystemBridge.moveEntry(
            sourceItem.path,
            job.destination.path,
            job.conflictStrategy,
          );
        }

        completedUnits += 1;
        await callbacks.onProgress(
          job.id,
          createProgress(job, completedUnits, sourceItem.displayName),
        );
      }

      await callbacks.onCompleted(job.id);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Yerel dosya işlemi tamamlanamadı.';
      const mappedError: OperationError = {
        code: 'LOCAL_OPERATION_FAILED',
        category: message.includes('izni') ? 'permission' : 'unknown',
        message,
        recoverable: true,
        providerId: 'local',
      };
      await callbacks.onFailed(job.id, mappedError);
    }
  }

  async cancel(_jobId: string): Promise<void> {
    return;
  }
}

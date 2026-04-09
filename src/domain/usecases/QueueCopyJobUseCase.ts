import type {
  ConflictResolutionStrategy,
  OperationTargetRef,
} from '@/domain/entities/OperationJob';
import {createOperationJob} from '@/domain/entities/OperationJob';
import type {OperationQueueProcessor} from '@/services/operations/OperationQueueProcessor';

export interface QueueCopyJobRequest {
  sourceItems: OperationTargetRef[];
  destination: OperationTargetRef;
  conflictStrategy?: ConflictResolutionStrategy;
  metadata?: Record<string, string | number | boolean | null>;
}

export class QueueCopyJobUseCase {
  constructor(private readonly processor: OperationQueueProcessor) {}

  async execute(request: QueueCopyJobRequest): Promise<string> {
    const job = createOperationJob({
      type: 'copy',
      sourceItems: request.sourceItems,
      destination: request.destination,
      ...(request.conflictStrategy
        ? {conflictStrategy: request.conflictStrategy}
        : {}),
      ...(request.metadata ? {metadata: request.metadata} : {}),
    });

    await this.processor.enqueue(job);
    return job.id;
  }
}

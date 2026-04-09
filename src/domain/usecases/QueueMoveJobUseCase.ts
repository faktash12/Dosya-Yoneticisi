import type {
  ConflictResolutionStrategy,
  OperationTargetRef,
} from '@/domain/entities/OperationJob';
import {createOperationJob} from '@/domain/entities/OperationJob';
import type {OperationQueueProcessor} from '@/services/operations/OperationQueueProcessor';

export interface QueueMoveJobRequest {
  sourceItems: OperationTargetRef[];
  destination: OperationTargetRef;
  conflictStrategy?: ConflictResolutionStrategy;
  metadata?: Record<string, string | number | boolean | null>;
}

export class QueueMoveJobUseCase {
  constructor(private readonly processor: OperationQueueProcessor) {}

  async execute(request: QueueMoveJobRequest): Promise<string> {
    const job = createOperationJob({
      type: 'move',
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

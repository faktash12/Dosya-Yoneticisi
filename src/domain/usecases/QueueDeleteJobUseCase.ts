import type {OperationTargetRef} from '@/domain/entities/OperationJob';
import {createOperationJob} from '@/domain/entities/OperationJob';
import type {OperationQueueProcessor} from '@/services/operations/OperationQueueProcessor';

export interface QueueDeleteJobRequest {
  targets: OperationTargetRef[];
}

export class QueueDeleteJobUseCase {
  constructor(private readonly processor: OperationQueueProcessor) {}

  async execute(request: QueueDeleteJobRequest): Promise<string> {
    const job = createOperationJob({
      type: 'delete',
      sourceItems: request.targets,
    });

    await this.processor.enqueue(job);
    return job.id;
  }
}


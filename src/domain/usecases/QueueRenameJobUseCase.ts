import type {OperationTargetRef} from '@/domain/entities/OperationJob';
import {createOperationJob} from '@/domain/entities/OperationJob';
import type {OperationQueueProcessor} from '@/services/operations/OperationQueueProcessor';

export interface QueueRenameJobRequest {
  target: OperationTargetRef;
  nextName: string;
}

export class QueueRenameJobUseCase {
  constructor(private readonly processor: OperationQueueProcessor) {}

  async execute(request: QueueRenameJobRequest): Promise<string> {
    const job = createOperationJob({
      type: 'rename',
      sourceItems: [request.target],
      metadata: {
        nextName: request.nextName,
      },
    });

    await this.processor.enqueue(job);
    return job.id;
  }
}


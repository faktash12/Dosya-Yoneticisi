import type {OperationTargetRef} from '@/domain/entities/OperationJob';
import {createOperationJob} from '@/domain/entities/OperationJob';
import type {OperationQueueProcessor} from '@/services/operations/OperationQueueProcessor';

export interface QueueCreateFolderJobRequest {
  parent: OperationTargetRef;
  folderName: string;
}

export class QueueCreateFolderJobUseCase {
  constructor(private readonly processor: OperationQueueProcessor) {}

  async execute(request: QueueCreateFolderJobRequest): Promise<string> {
    const job = createOperationJob({
      type: 'create-folder',
      sourceItems: [request.parent],
      destination: request.parent,
      metadata: {
        folderName: request.folderName,
      },
    });

    await this.processor.enqueue(job);
    return job.id;
  }
}


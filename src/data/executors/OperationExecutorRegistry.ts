import type {OperationJob} from '@/domain/entities/OperationJob';
import type {OperationExecutor} from '@/domain/repositories/OperationExecutor';

export class OperationExecutorRegistry {
  constructor(private readonly executors: OperationExecutor[]) {}

  resolve(job: OperationJob): OperationExecutor {
    const executor = this.executors.find(candidate => candidate.supports(job));

    if (!executor) {
      throw new Error(`No executor registered for operation type: ${job.type}`);
    }

    return executor;
  }
}


import type {OperationJob} from '@/domain/entities/OperationJob';
import type {OperationError} from '@/domain/entities/OperationError';
import type {OperationJobRepository} from '@/domain/repositories/OperationJobRepository';

export class InMemoryOperationJobRepository implements OperationJobRepository {
  private jobs: OperationJob[] = [];
  private listeners = new Set<(jobs: OperationJob[]) => void>();

  async enqueue(job: OperationJob): Promise<void> {
    this.jobs = [job, ...this.jobs];
    this.notify();
  }

  async enqueueMany(jobs: OperationJob[]): Promise<void> {
    this.jobs = [...jobs, ...this.jobs];
    this.notify();
  }

  async updateStatus(jobId: string, status: OperationJob['status']): Promise<void> {
    this.jobs = this.jobs.map(job =>
      job.id === jobId
        ? {
            ...job,
            status,
            updatedAt: new Date().toISOString(),
          }
        : job,
    );
    this.notify();
  }

  async updateProgress(
    jobId: string,
    progress: OperationJob['progress'],
  ): Promise<void> {
    this.jobs = this.jobs.map(job =>
      job.id === jobId
        ? {
            ...job,
            progress,
            updatedAt: new Date().toISOString(),
          }
        : job,
    );
    this.notify();
  }

  async attachError(jobId: string, error: OperationError): Promise<void> {
    this.jobs = this.jobs.map(job =>
      job.id === jobId
        ? {
            ...job,
            error,
            updatedAt: new Date().toISOString(),
          }
        : job,
    );
    this.notify();
  }

  async incrementAttempt(jobId: string): Promise<void> {
    this.jobs = this.jobs.map(job =>
      job.id === jobId
        ? {
            ...job,
            attemptCount: job.attemptCount + 1,
            updatedAt: new Date().toISOString(),
          }
        : job,
    );
    this.notify();
  }

  async getById(jobId: string): Promise<OperationJob | undefined> {
    return this.jobs.find(job => job.id === jobId);
  }

  async getNextPending(): Promise<OperationJob | undefined> {
    return [...this.jobs]
      .reverse()
      .find(job => job.status === 'pending');
  }

  async listJobs(): Promise<OperationJob[]> {
    return this.jobs;
  }

  subscribe(listener: (jobs: OperationJob[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.jobs);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.jobs));
  }
}


import type {StorageProviderScope} from '@/domain/entities/FileSystemNode';
import type {OperationError} from '@/domain/entities/OperationError';

export type OperationType =
  | 'copy'
  | 'move'
  | 'rename'
  | 'delete'
  | 'create-folder';

export type OperationJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ConflictResolutionStrategy = 'overwrite' | 'skip' | 'rename';

export interface OperationTargetRef {
  providerId: StorageProviderScope;
  accountId?: string;
  entryId: string;
  displayName: string;
  path: string;
  entryType: 'file' | 'directory';
  sizeBytes?: number;
}

export interface OperationProgress {
  totalUnits: number;
  completedUnits: number;
  percentage: number;
  currentItemName?: string;
  startedAt?: string;
  updatedAt?: string;
}

export interface OperationJob {
  id: string;
  type: OperationType;
  status: OperationJobStatus;
  sourceItems: OperationTargetRef[];
  destination?: OperationTargetRef;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  maxAttempts: number;
  priority: 'normal' | 'high';
  conflictStrategy: ConflictResolutionStrategy;
  progress: OperationProgress;
  error?: OperationError;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface CreateOperationJobParams {
  type: OperationType;
  sourceItems: OperationTargetRef[];
  destination?: OperationTargetRef;
  maxAttempts?: number;
  priority?: 'normal' | 'high';
  conflictStrategy?: ConflictResolutionStrategy;
  metadata?: Record<string, string | number | boolean | null>;
}

export const createOperationJobId = (): string => {
  return `operation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export const createOperationJob = (
  params: CreateOperationJobParams,
): OperationJob => {
  const timestamp = new Date().toISOString();

  const job: OperationJob = {
    id: createOperationJobId(),
    type: params.type,
    status: 'pending',
    sourceItems: params.sourceItems,
    createdAt: timestamp,
    updatedAt: timestamp,
    attemptCount: 0,
    maxAttempts: params.maxAttempts ?? 2,
    priority: params.priority ?? 'normal',
    conflictStrategy: params.conflictStrategy ?? 'rename',
    progress: {
      totalUnits: Math.max(params.sourceItems.length, 1),
      completedUnits: 0,
      percentage: 0,
    },
  };

  if (params.destination) {
    job.destination = params.destination;
  }

  if (params.metadata) {
    job.metadata = params.metadata;
  }

  return job;
};

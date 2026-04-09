import type {StorageProviderScope} from '@/domain/entities/FileSystemNode';
import type {AppErrorDescriptor} from '@/types/common';

export type TransferTaskType =
  | 'copy'
  | 'move'
  | 'upload'
  | 'download'
  | 'zip'
  | 'unzip'
  | 'delete';

export type TransferTaskStatus =
  | 'queued'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface TransferTaskNodeRef {
  nodeId: string;
  name: string;
  path: string;
  providerId: StorageProviderScope;
  sizeBytes?: number;
}

export interface TransferTaskProgress {
  totalBytes: number;
  transferredBytes: number;
  percentage: number;
  startedAt?: string;
  updatedAt?: string;
}

export interface TransferTask {
  id: string;
  type: TransferTaskType;
  status: TransferTaskStatus;
  source: TransferTaskNodeRef;
  destination?: TransferTaskNodeRef;
  priority: number;
  createdAt: string;
  updatedAt: string;
  conflictPolicy: 'overwrite' | 'skip' | 'rename';
  progress: TransferTaskProgress;
  error?: AppErrorDescriptor;
  metadata?: Record<string, string | number | boolean | null>;
}


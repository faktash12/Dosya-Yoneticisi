import type {StorageProviderScope} from '@/domain/entities/FileSystemNode';

export type OperationErrorCategory =
  | 'permission'
  | 'not-found'
  | 'conflict'
  | 'network'
  | 'unsupported'
  | 'cancelled'
  | 'unknown';

export interface OperationError {
  code: string;
  category: OperationErrorCategory;
  message: string;
  recoverable: boolean;
  providerId?: StorageProviderScope;
  details?: string;
}


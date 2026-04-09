import type {StorageProviderScope} from '@/domain/entities/FileSystemNode';
import type {OperationTargetRef} from '@/domain/entities/OperationJob';

export type ClipboardMode = 'copy' | 'cut';

export interface ClipboardBuffer {
  id: string;
  mode: ClipboardMode;
  items: OperationTargetRef[];
  sourceLocationPath: string;
  sourceProviderId: StorageProviderScope;
  createdAt: string;
}


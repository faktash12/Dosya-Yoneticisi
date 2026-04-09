import type {ClipboardBuffer} from '@/domain/entities/ClipboardBuffer';
import type {OperationTargetRef} from '@/domain/entities/OperationJob';
import type {StorageProviderScope} from '@/domain/entities/FileSystemNode';

const createClipboardId = (): string => {
  return `clipboard-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

export class OperationClipboardService {
  private buffer: ClipboardBuffer | null = null;
  private listeners = new Set<(buffer: ClipboardBuffer | null) => void>();

  setCopyBuffer(
    items: OperationTargetRef[],
    sourceLocationPath: string,
    sourceProviderId: StorageProviderScope,
  ): void {
    this.buffer = {
      id: createClipboardId(),
      mode: 'copy',
      items,
      sourceLocationPath,
      sourceProviderId,
      createdAt: new Date().toISOString(),
    };

    this.notify();
  }

  setCutBuffer(
    items: OperationTargetRef[],
    sourceLocationPath: string,
    sourceProviderId: StorageProviderScope,
  ): void {
    this.buffer = {
      id: createClipboardId(),
      mode: 'cut',
      items,
      sourceLocationPath,
      sourceProviderId,
      createdAt: new Date().toISOString(),
    };

    this.notify();
  }

  clear(): void {
    this.buffer = null;
    this.notify();
  }

  clearIfMatches(bufferId?: string): void {
    if (!bufferId || this.buffer?.id !== bufferId) {
      return;
    }

    this.clear();
  }

  getSnapshot(): ClipboardBuffer | null {
    return this.buffer;
  }

  subscribe(listener: (buffer: ClipboardBuffer | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.buffer);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.buffer));
  }
}


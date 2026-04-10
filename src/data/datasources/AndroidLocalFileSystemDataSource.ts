import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {DirectoryNotFoundError} from '@/data/datasources/MockFileSystemDataSource';
import {
  LocalFileSystemPermissionError,
  localFileSystemBridge,
} from '@/services/platform/LocalFileSystemBridge';

export class AndroidLocalFileSystemDataSource {
  async getRootDirectory(): Promise<string> {
    return localFileSystemBridge.getRootDirectory();
  }

  async listDirectory(path: string): Promise<FileSystemNode[]> {
    try {
      const result = await localFileSystemBridge.listDirectory(path);
      return result.map(node => {
        const {extension, mimeType, ...rest} = node;

        return {
          ...rest,
          ...(typeof extension === 'string' ? {extension} : {}),
          ...(typeof mimeType === 'string' ? {mimeType} : {}),
        };
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Depolama içeriği okunamadı.';

      if (error instanceof LocalFileSystemPermissionError) {
        throw error;
      }

      if (message.includes('Kaynak bulunamadı')) {
        throw new DirectoryNotFoundError(path);
      }

      throw new Error(message);
    }
  }
}

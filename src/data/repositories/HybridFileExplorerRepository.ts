import {Platform} from 'react-native';

import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import type {
  BrowseDirectoryParams,
  FileExplorerRepository,
} from '@/domain/repositories/FileExplorerRepository';
import type {AndroidLocalFileSystemDataSource} from '@/data/datasources/AndroidLocalFileSystemDataSource';
import type {MockFileSystemDataSource} from '@/data/datasources/MockFileSystemDataSource';

export class HybridFileExplorerRepository implements FileExplorerRepository {
  constructor(
    private readonly androidLocalDataSource: AndroidLocalFileSystemDataSource,
    private readonly mockDataSource: MockFileSystemDataSource,
  ) {}

  async listDirectory(params: BrowseDirectoryParams): Promise<FileSystemNode[]> {
    if (Platform.OS === 'android' && params.providerId === 'local') {
      return this.androidLocalDataSource.listDirectory(params.path);
    }

    return this.mockDataSource.listDirectory(params.path);
  }

  async getFavorites(): Promise<FileSystemNode[]> {
    return [];
  }

  async getRecent(): Promise<FileSystemNode[]> {
    return this.mockDataSource.getRecent();
  }

  async search(query: string): Promise<FileSystemNode[]> {
    return this.mockDataSource.search(query);
  }
}

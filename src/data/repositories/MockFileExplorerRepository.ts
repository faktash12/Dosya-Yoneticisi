import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import type {
  BrowseDirectoryParams,
  FileExplorerRepository,
} from '@/domain/repositories/FileExplorerRepository';
import type {MockFileSystemDataSource} from '@/data/datasources/MockFileSystemDataSource';

export class MockFileExplorerRepository implements FileExplorerRepository {
  constructor(private readonly dataSource: MockFileSystemDataSource) {}

  async listDirectory(params: BrowseDirectoryParams): Promise<FileSystemNode[]> {
    return this.dataSource.listDirectory(params.path);
  }

  async getFavorites(): Promise<FileSystemNode[]> {
    return this.dataSource.getFavorites();
  }

  async getRecent(): Promise<FileSystemNode[]> {
    return this.dataSource.getRecent();
  }

  async search(query: string): Promise<FileSystemNode[]> {
    return this.dataSource.search(query);
  }
}

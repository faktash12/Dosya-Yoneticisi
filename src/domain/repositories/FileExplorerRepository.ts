import type {
  FileSystemNode,
  StorageProviderScope,
} from '@/domain/entities/FileSystemNode';

export interface BrowseDirectoryParams {
  path: string;
  providerId: StorageProviderScope;
}

export interface FileExplorerRepository {
  listDirectory(params: BrowseDirectoryParams): Promise<FileSystemNode[]>;
  getFavorites(): Promise<FileSystemNode[]>;
  getRecent(): Promise<FileSystemNode[]>;
  search(query: string): Promise<FileSystemNode[]>;
}


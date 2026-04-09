import type {
  FileSystemNode,
  StorageProviderScope,
} from '@/domain/entities/FileSystemNode';
import type {FileExplorerRepository} from '@/domain/repositories/FileExplorerRepository';

export interface BrowseDirectoryRequest {
  path: string;
  providerId: StorageProviderScope;
}

export class BrowseDirectoryUseCase {
  constructor(private readonly repository: FileExplorerRepository) {}

  async execute(request: BrowseDirectoryRequest): Promise<FileSystemNode[]> {
    return this.repository.listDirectory({
      path: request.path,
      providerId: request.providerId,
    });
  }
}


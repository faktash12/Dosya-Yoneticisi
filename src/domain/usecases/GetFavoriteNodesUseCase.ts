import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import type {FileExplorerRepository} from '@/domain/repositories/FileExplorerRepository';

export class GetFavoriteNodesUseCase {
  constructor(private readonly repository: FileExplorerRepository) {}

  async execute(): Promise<FileSystemNode[]> {
    return this.repository.getFavorites();
  }
}


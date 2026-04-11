import type {CloudProviderSummary} from '@/domain/entities/CloudProvider';
import type {CloudStorageRepository} from '@/domain/repositories/CloudStorageRepository';

export class GetAvailableProvidersUseCase {
  constructor(private readonly providers: CloudStorageRepository[]) {}

  async execute(): Promise<CloudProviderSummary[]> {
    return Promise.all(this.providers.map(provider => provider.getSummary()));
  }
}

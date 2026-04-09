import type {CloudProviderSummary} from '@/domain/entities/CloudProvider';
import type {CloudStorageProvider} from '@/domain/repositories/CloudStorageProvider';

export class GetAvailableProvidersUseCase {
  constructor(private readonly providers: CloudStorageProvider[]) {}

  async execute(): Promise<CloudProviderSummary[]> {
    const statuses = await Promise.all(
      this.providers.map(provider => provider.getConnectionStatus()),
    );

    return statuses.map(status => status.summary);
  }
}

import type {CloudProviderId} from '@/domain/entities/CloudProvider';
import type {CloudStorageRepository} from '@/domain/repositories/CloudStorageRepository';

export class CloudProviderRegistry {
  private readonly providersById: Map<CloudProviderId, CloudStorageRepository>;

  constructor(private readonly providers: CloudStorageRepository[]) {
    this.providersById = new Map(
      providers.map(provider => [provider.providerId, provider]),
    );
  }

  getAll(): CloudStorageRepository[] {
    return this.providers;
  }

  get(providerId: CloudProviderId): CloudStorageRepository {
    const provider = this.providersById.get(providerId);

    if (!provider) {
      throw new Error('Bulut sağlayıcısı bulunamadı.');
    }

    return provider;
  }
}

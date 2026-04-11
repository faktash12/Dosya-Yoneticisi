import type {
  CloudFolderPage,
  CloudItem,
  CloudProviderAccount,
  CloudProviderId,
  CloudProviderSummary,
} from '@/domain/entities/CloudProvider';
import type {
  CloudDownloadRequest,
  CloudListFolderRequest,
  CloudStorageRepository,
  CloudUploadRequest,
} from '@/domain/repositories/CloudStorageRepository';

export class PhaseTwoPlaceholderCloudProvider implements CloudStorageRepository {
  readonly capabilities = [];

  constructor(
    readonly providerId: Extract<CloudProviderId, 'onedrive' | 'dropbox'>,
    readonly displayName: string,
  ) {}

  async getSummary(): Promise<CloudProviderSummary> {
    return {
      providerId: this.providerId,
      displayName: this.displayName,
      status: 'not_configured',
      connected: false,
      isConfigured: false,
      errorMessage: 'Ikinci fazda eklenecek.',
      capabilities: this.capabilities,
    };
  }

  async connect(): Promise<CloudProviderSummary> {
    throw new Error(`${this.displayName} ikinci fazda eklenecek.`);
  }

  async disconnect(): Promise<void> {
    return undefined;
  }

  async getAccountInfo(): Promise<CloudProviderAccount> {
    throw new Error(`${this.displayName} henuz yapilandirilmadi.`);
  }

  async listFolder(_request: CloudListFolderRequest): Promise<CloudFolderPage> {
    throw new Error(`${this.displayName} ikinci fazda eklenecek.`);
  }

  async downloadFile(_request: CloudDownloadRequest): Promise<string> {
    throw new Error(`${this.displayName} ikinci fazda eklenecek.`);
  }

  async uploadFile(_request: CloudUploadRequest): Promise<CloudItem> {
    throw new Error(`${this.displayName} ikinci fazda eklenecek.`);
  }

  async refreshTokenIfNeeded(): Promise<void> {
    return undefined;
  }
}

import type {
  CloudAuthSession,
  CloudFolderPage,
  CloudItem,
  CloudProviderAccount,
  CloudProviderCapability,
  CloudProviderId,
  CloudProviderSummary,
} from '@/domain/entities/CloudProvider';
import type {
  CloudDownloadRequest,
  CloudListFolderRequest,
  CloudStorageRepository,
  CloudUploadRequest,
} from '@/domain/repositories/CloudStorageRepository';
import type {CloudProviderConfig} from '@/config/cloudConfig';
import {isCloudProviderConfigured} from '@/config/cloudConfig';
import type {OAuthService} from '@/services/auth/OAuthService';
import type {CloudHttpClient} from '@/services/cloud/CloudHttpClient';
import {getCloudProviderDownloadDirectory} from '@/services/cloud/cloudPath';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';

export abstract class BaseCloudProvider implements CloudStorageRepository {
  readonly capabilities: CloudProviderCapability[] = [
    'browse',
    'download',
    'upload',
  ];

  constructor(
    readonly providerId: CloudProviderId,
    readonly displayName: string,
    protected readonly config: CloudProviderConfig,
    protected readonly oauthService: OAuthService,
    protected readonly httpClient: CloudHttpClient,
  ) {}

  async getSummary(): Promise<CloudProviderSummary> {
    if (!isCloudProviderConfigured(this.providerId)) {
      return this.createSummary({
        status: 'not_configured',
        errorMessage: 'OAuth yapılandırması eksik.',
      });
    }

    const session = await this.oauthService.getSession(this.providerId);

    if (!session) {
      return this.createSummary({status: 'disconnected'});
    }

    try {
      await this.refreshTokenIfNeeded();
      const account = await this.getAccountInfo();
      return this.createSummary({status: 'connected', account});
    } catch (error) {
      return this.createSummary({
        status: 'error',
        errorMessage:
          error instanceof Error ? error.message : 'Hesap durumu okunamadı.',
      });
    }
  }

  async connect(): Promise<CloudProviderSummary> {
    await this.oauthService.authorize(this.providerId, this.config);
    const account = await this.getAccountInfo();
    const session = await this.requireSession();
    await this.oauthService.saveSession({
      ...session,
      account,
    });
    return this.createSummary({status: 'connected', account});
  }

  async disconnect(): Promise<void> {
    await this.oauthService.clearSession(this.providerId);
  }

  async refreshTokenIfNeeded(): Promise<void> {
    await this.oauthService.refresh(this.providerId, this.config);
  }

  abstract getAccountInfo(): Promise<CloudProviderAccount>;
  abstract listFolder(request: CloudListFolderRequest): Promise<CloudFolderPage>;
  abstract uploadFile(request: CloudUploadRequest): Promise<CloudItem>;

  async downloadFile(request: CloudDownloadRequest): Promise<string> {
    const downloadUrl = await this.resolveDownloadUrl(request.fileId);
    const destinationDirectoryPath =
      request.destinationDirectoryPath ||
      getCloudProviderDownloadDirectory(this.displayName);

    await localFileSystemBridge.createDirectory(destinationDirectoryPath);
    return localFileSystemBridge.downloadUrlToFile(
      downloadUrl.url,
      downloadUrl.headers ?? {},
      `${destinationDirectoryPath}/${request.fileName}`,
    );
  }

  protected abstract resolveDownloadUrl(
    fileId: string,
  ): Promise<{url: string; headers?: Record<string, string>}>;

  protected async requireSession(): Promise<CloudAuthSession> {
    const session = await this.oauthService.getSession(this.providerId);

    if (!session) {
      throw new Error('Bulut hesabı bağlı değil.');
    }

    return session;
  }

  protected async request<TResponse>(
    requestConfig: Parameters<CloudHttpClient['request']>[3],
  ): Promise<TResponse> {
    const session = await this.requireSession();
    return this.httpClient.request<TResponse>(
      this.providerId,
      this.config,
      session,
      requestConfig,
    );
  }

  protected createSummary(input: {
    status: CloudProviderSummary['status'];
    account?: CloudProviderAccount;
    errorMessage?: string;
  }): CloudProviderSummary {
    return {
      providerId: this.providerId,
      displayName: this.displayName,
      status: input.status,
      connected: input.status === 'connected',
      isConfigured: isCloudProviderConfigured(this.providerId),
      capabilities: this.capabilities,
      ...(input.account ? {account: input.account} : {}),
      ...(input.errorMessage ? {errorMessage: input.errorMessage} : {}),
    };
  }

  protected normalizeModifiedAt(value?: string): string {
    return value && !Number.isNaN(new Date(value).getTime())
      ? new Date(value).toISOString()
      : new Date().toISOString();
  }
}

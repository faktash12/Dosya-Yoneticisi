import type {
  CloudFolderPage,
  CloudItem,
  CloudProviderAccount,
} from '@/domain/entities/CloudProvider';
import type {
  CloudListFolderRequest,
  CloudUploadRequest,
} from '@/domain/repositories/CloudStorageRepository';
import {BaseCloudProvider} from '@/data/datasources/cloud/BaseCloudProvider';
import type {CloudProviderConfig} from '@/config/cloudConfig';
import type {OAuthService} from '@/services/auth/OAuthService';
import type {CloudHttpClient} from '@/services/cloud/CloudHttpClient';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';

interface YandexDiskInfo {
  user?: {
    uid?: string;
    display_name?: string;
    login?: string;
  };
  total_space?: number;
  used_space?: number;
}

interface YandexResource {
  resource_id?: string;
  name: string;
  path: string;
  type: 'file' | 'dir';
  mime_type?: string;
  size?: number;
  modified?: string;
  created?: string;
  preview?: string;
  public_url?: string;
  _embedded?: {
    items?: YandexResource[];
    limit?: number;
    offset?: number;
    total?: number;
  };
}

interface YandexLinkResponse {
  href: string;
  method?: string;
}

export class YandexDiskCloudProvider extends BaseCloudProvider {
  constructor(
    config: CloudProviderConfig,
    oauthService: OAuthService,
    httpClient: CloudHttpClient,
  ) {
    super('yandex_disk', 'Yandex Disk', config, oauthService, httpClient);
  }

  async getAccountInfo(): Promise<CloudProviderAccount> {
    const info = await this.request<YandexDiskInfo>({
      url: 'https://cloud-api.yandex.net/v1/disk',
    });

    return {
      accountId: info.user?.uid ?? info.user?.login ?? 'yandex_disk',
      displayName: info.user?.display_name ?? info.user?.login ?? 'Yandex Disk hesabı',
      ...(info.user?.login ? {email: info.user.login} : {}),
      ...(info.used_space != null ? {usedBytes: info.used_space} : {}),
      ...(info.total_space != null ? {totalBytes: info.total_space} : {}),
    };
  }

  async listFolder(request: CloudListFolderRequest): Promise<CloudFolderPage> {
    const path = request.path || request.folderId || 'disk:/';
    const offset = request.cursor ? Number(request.cursor) : 0;
    const limit = 100;
    const resource = await this.request<YandexResource>({
      url: 'https://cloud-api.yandex.net/v1/disk/resources',
      params: {
        path,
        limit,
        offset,
        preview_size: 'M',
      },
    });
    const items = resource._embedded?.items ?? [];
    const total = resource._embedded?.total ?? items.length;
    const nextOffset = offset + limit;

    return {
      items: items.map(item => this.mapResource(item, path)),
      ...(nextOffset < total ? {nextCursor: String(nextOffset)} : {}),
    };
  }

  async uploadFile(request: CloudUploadRequest): Promise<CloudItem> {
    const fileName = request.fileName ?? request.localPath.split('/').pop() ?? 'dosya';
    const parentPath = request.parentPath || request.parentId || 'disk:/';
    const targetPath = `${parentPath.replace(/\/$/, '')}/${fileName}`;
    const link = await this.request<YandexLinkResponse>({
      url: 'https://cloud-api.yandex.net/v1/disk/resources/upload',
      params: {
        path: targetPath,
        overwrite: false,
      },
    });

    await localFileSystemBridge.uploadFileToUrl(
      link.method ?? 'PUT',
      link.href,
      {},
      request.localPath,
    );

    const uploaded = await this.request<YandexResource>({
      url: 'https://cloud-api.yandex.net/v1/disk/resources',
      params: {path: targetPath, preview_size: 'M'},
    });
    return this.mapResource(uploaded, parentPath);
  }

  protected async resolveDownloadUrl(
    fileId: string,
  ): Promise<{url: string; headers?: Record<string, string>}> {
    const link = await this.request<YandexLinkResponse>({
      url: 'https://cloud-api.yandex.net/v1/disk/resources/download',
      params: {path: fileId},
    });
    return {url: link.href};
  }

  private mapResource(resource: YandexResource, parentPath?: string): CloudItem {
    return {
      id: resource.path,
      providerId: this.providerId,
      name: resource.name,
      path: resource.path,
      kind: resource.type === 'dir' ? 'directory' : 'file',
      modifiedAt: this.normalizeModifiedAt(resource.modified ?? resource.created),
      ...(resource.mime_type ? {mimeType: resource.mime_type} : {}),
      ...(resource.size != null ? {sizeBytes: resource.size} : {}),
      ...(parentPath ? {parentId: parentPath} : {}),
      ...(resource.preview ? {thumbnailUrl: resource.preview} : {}),
      ...(resource.public_url ? {isShared: true} : {}),
    };
  }
}

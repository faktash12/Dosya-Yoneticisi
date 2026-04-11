import type {
  CloudFolderPage,
  CloudItem,
  CloudProviderAccount,
  CloudProviderId,
  CloudProviderSummary,
} from '@/domain/entities/CloudProvider';

export interface CloudListFolderRequest {
  folderId?: string;
  path?: string;
  cursor?: string;
}

export interface CloudDownloadRequest {
  fileId: string;
  fileName: string;
  destinationDirectoryPath: string;
}

export interface CloudUploadRequest {
  localPath: string;
  parentId?: string;
  parentPath?: string;
  fileName?: string;
}

export interface CloudCreateFolderRequest {
  name: string;
  parentId?: string;
  parentPath?: string;
}

export interface CloudStorageRepository {
  readonly providerId: CloudProviderId;
  readonly displayName: string;
  getSummary(): Promise<CloudProviderSummary>;
  connect(): Promise<CloudProviderSummary>;
  disconnect(): Promise<void>;
  getAccountInfo(): Promise<CloudProviderAccount>;
  listFolder(request: CloudListFolderRequest): Promise<CloudFolderPage>;
  downloadFile(request: CloudDownloadRequest): Promise<string>;
  uploadFile(request: CloudUploadRequest): Promise<CloudItem>;
  refreshTokenIfNeeded(): Promise<void>;
  createFolder?(request: CloudCreateFolderRequest): Promise<CloudItem>;
}

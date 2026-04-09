import type {
  CloudProviderCapability,
  CloudProviderId,
  CloudProviderSummary,
} from '@/domain/entities/CloudProvider';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

export interface ProviderConnectionStatus {
  connected: boolean;
  summary: CloudProviderSummary;
}

export interface ListRemoteDirectoryParams {
  remotePath: string;
}

export interface UploadFileRequest {
  localPath: string;
  remotePath: string;
}

export interface DownloadFileRequest {
  remotePath: string;
  localPath: string;
}

export interface CloudStorageProvider {
  readonly providerId: CloudProviderId;
  readonly displayName: string;
  readonly capabilities: CloudProviderCapability[];
  getConnectionStatus(): Promise<ProviderConnectionStatus>;
  connect(): Promise<ProviderConnectionStatus>;
  disconnect(): Promise<void>;
  listDirectory(params: ListRemoteDirectoryParams): Promise<FileSystemNode[]>;
  uploadFile(request: UploadFileRequest): Promise<string>;
  downloadFile(request: DownloadFileRequest): Promise<string>;
  renameNode(nodeId: string, nextName: string): Promise<void>;
  deleteNode(nodeId: string): Promise<void>;
  search(query: string): Promise<FileSystemNode[]>;
}


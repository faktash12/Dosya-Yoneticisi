import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import type {
  CloudProviderCapability,
  CloudProviderSummary,
} from '@/domain/entities/CloudProvider';
import type {
  CloudStorageProvider,
  DownloadFileRequest,
  ListRemoteDirectoryParams,
  ProviderConnectionStatus,
  UploadFileRequest,
} from '@/domain/repositories/CloudStorageProvider';

const capabilities: CloudProviderCapability[] = [
  'browse',
  'search',
  'upload',
  'download',
  'move',
  'copy',
  'delete',
  'rename',
];

const summary: CloudProviderSummary = {
  providerId: 'yandex-disk',
  displayName: 'Yandex Disk',
  connected: false,
  capabilities,
};

export class YandexDiskProviderStub implements CloudStorageProvider {
  readonly providerId = 'yandex-disk' as const;
  readonly displayName = 'Yandex Disk';
  readonly capabilities = [...summary.capabilities];

  async getConnectionStatus(): Promise<ProviderConnectionStatus> {
    return {connected: false, summary};
  }

  async connect(): Promise<ProviderConnectionStatus> {
    return {connected: false, summary};
  }

  async disconnect(): Promise<void> {}

  async listDirectory(_params: ListRemoteDirectoryParams): Promise<FileSystemNode[]> {
    return [];
  }

  async uploadFile(_request: UploadFileRequest): Promise<string> {
    return 'queued-yandex-upload';
  }

  async downloadFile(_request: DownloadFileRequest): Promise<string> {
    return 'queued-yandex-download';
  }

  async renameNode(_nodeId: string, _nextName: string): Promise<void> {}

  async deleteNode(_nodeId: string): Promise<void> {}

  async search(_query: string): Promise<FileSystemNode[]> {
    return [];
  }
}

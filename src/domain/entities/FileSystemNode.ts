export type StorageProviderScope =
  | 'local'
  | 'google_drive'
  | 'onedrive'
  | 'dropbox'
  | 'yandex_disk';

export type FileNodeKind = 'file' | 'directory';

export interface FilePermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
}

export interface FileSystemNode {
  id: string;
  name: string;
  path: string;
  kind: FileNodeKind;
  providerId: StorageProviderScope;
  modifiedAt: string;
  sizeBytes?: number;
  extension?: string;
  mimeType?: string;
  isFavorite?: boolean;
  isRecent?: boolean;
  childCount?: number;
  permissions: FilePermissions;
}

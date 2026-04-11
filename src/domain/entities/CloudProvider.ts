export type CloudProviderId =
  | 'google_drive'
  | 'onedrive'
  | 'dropbox'
  | 'yandex_disk';

export type CloudItemKind = 'file' | 'directory';

export type CloudConnectionStatus =
  | 'not_configured'
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export type CloudProviderCapability =
  | 'browse'
  | 'upload'
  | 'download'
  | 'create-folder';

export interface CloudProviderAccount {
  accountId: string;
  displayName: string;
  email?: string;
  usedBytes?: number;
  totalBytes?: number;
}

export interface CloudProviderSummary {
  providerId: CloudProviderId;
  displayName: string;
  status: CloudConnectionStatus;
  connected: boolean;
  isConfigured: boolean;
  account?: CloudProviderAccount;
  errorMessage?: string;
  capabilities: CloudProviderCapability[];
}

export interface CloudItem {
  id: string;
  providerId: CloudProviderId;
  name: string;
  path: string;
  kind: CloudItemKind;
  mimeType?: string;
  sizeBytes?: number;
  modifiedAt: string;
  parentId?: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
  isShared?: boolean;
}

export interface CloudFolderPage {
  items: CloudItem[];
  nextCursor?: string;
}

export interface CloudAuthSession {
  providerId: CloudProviderId;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType: 'Bearer';
  scope?: string;
  account?: CloudProviderAccount;
}

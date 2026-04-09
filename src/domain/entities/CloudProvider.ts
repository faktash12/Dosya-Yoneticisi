export type CloudProviderId = 'google-drive' | 'one-drive' | 'yandex-disk';

export type CloudProviderCapability =
  | 'browse'
  | 'search'
  | 'upload'
  | 'download'
  | 'move'
  | 'copy'
  | 'delete'
  | 'rename';

export interface CloudProviderAccount {
  accountId: string;
  displayName: string;
  email: string;
}

export interface CloudProviderSummary {
  providerId: CloudProviderId;
  displayName: string;
  connected: boolean;
  account?: CloudProviderAccount;
  capabilities: CloudProviderCapability[];
}


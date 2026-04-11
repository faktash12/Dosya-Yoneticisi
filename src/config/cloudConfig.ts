import {NativeModules} from 'react-native';

import type {CloudProviderId} from '@/domain/entities/CloudProvider';

export interface CloudProviderConfig {
  providerId: CloudProviderId;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
}

const readEnvValue = (key: string): string => {
  const maybeProcess = (globalThis as {process?: {env?: Record<string, string | undefined>}})
    .process;
  const processValue = maybeProcess?.env?.[key]?.trim();

  if (processValue) {
    return processValue;
  }

  const nativeEnvironment = (
    NativeModules.LocalFileSystemModule as
      | {cloudEnvironment?: Record<string, string | undefined>}
      | undefined
  )?.cloudEnvironment;

  return nativeEnvironment?.[key]?.trim() ?? '';
};

const deriveGoogleRedirectUri = (clientId: string): string =>
  clientId
    ? `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}:/oauth2redirect`
    : 'filemanagerpro://oauth/google_drive';

const googleDriveClientId = readEnvValue('GOOGLE_DRIVE_CLIENT_ID');

export const cloudProviderConfigs: Record<CloudProviderId, CloudProviderConfig> = {
  google_drive: {
    providerId: 'google_drive',
    clientId: googleDriveClientId,
    redirectUri:
      readEnvValue('GOOGLE_DRIVE_REDIRECT_URI') ||
      deriveGoogleRedirectUri(googleDriveClientId),
    scopes: ['https://www.googleapis.com/auth/drive'],
  },
  onedrive: {
    providerId: 'onedrive',
    clientId: readEnvValue('ONEDRIVE_CLIENT_ID'),
    redirectUri:
      readEnvValue('ONEDRIVE_REDIRECT_URI') ||
      'filemanagerpro://oauth/onedrive',
    scopes: ['offline_access', 'Files.ReadWrite', 'User.Read'],
  },
  dropbox: {
    providerId: 'dropbox',
    clientId: readEnvValue('DROPBOX_APP_KEY'),
    redirectUri:
      readEnvValue('DROPBOX_REDIRECT_URI') ||
      'filemanagerpro://oauth/dropbox',
    scopes: ['files.metadata.read', 'files.content.read', 'files.content.write', 'account_info.read'],
  },
  yandex_disk: {
    providerId: 'yandex_disk',
    clientId: readEnvValue('YANDEX_CLIENT_ID'),
    clientSecret: readEnvValue('YANDEX_CLIENT_SECRET'),
    redirectUri:
      readEnvValue('YANDEX_REDIRECT_URI') ||
      'filemanagerpro://oauth/yandex_disk',
    scopes: ['cloud_api:disk.read', 'cloud_api:disk.write'],
  },
};

export const isCloudProviderConfigured = (providerId: CloudProviderId): boolean => {
  const config = cloudProviderConfigs[providerId];
  return config.clientId.length > 0 && config.redirectUri.length > 0;
};

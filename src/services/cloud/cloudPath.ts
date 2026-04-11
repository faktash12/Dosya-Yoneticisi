import type {CloudProviderId} from '@/domain/entities/CloudProvider';

export const CLOUD_DOWNLOAD_DIRECTORY = '/storage/emulated/0/Download/Bulut';

export const getCloudProviderDownloadDirectory = (
  providerDisplayName: string,
): string => `${CLOUD_DOWNLOAD_DIRECTORY}/${providerDisplayName}`;

export const buildCloudPath = (
  providerId: CloudProviderId,
  itemId: string,
): string => `cloud://${providerId}/${encodeURIComponent(itemId)}`;

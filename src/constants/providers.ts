import type {CloudProviderId} from '@/domain/entities/CloudProvider';

export const CLOUD_PROVIDER_LABELS: Record<CloudProviderId, string> = {
  google_drive: 'Google Drive',
  onedrive: 'OneDrive',
  dropbox: 'Dropbox',
  yandex_disk: 'Yandex Disk',
};

import type {ExplorerStorageCardItem} from '@/features/explorer/types/explorer.types';

export const storageCards: ExplorerStorageCardItem[] = [
  {
    id: 'internal-storage',
    title: 'Ana bellek',
    subtitle: 'Cihazdaki ana depolama alanı',
    usedLabel: '92,4 GB',
    totalLabel: '128 GB',
    usageRatio: 0.72,
    icon: 'storage',
  },
  {
    id: 'system',
    title: 'Sistem Dosyaları',
    subtitle: 'Android sistem klasörleri',
    usedLabel: 'Android',
    totalLabel: 'korumalı',
    usageRatio: 0.18,
    icon: 'system',
  },
  {
    id: 'downloads',
    title: 'İndirilenler',
    subtitle: 'İndirilen dosyalar',
    usedLabel: 'Download',
    totalLabel: 'klasörü',
    usageRatio: 0.32,
    icon: 'downloads',
  },
];

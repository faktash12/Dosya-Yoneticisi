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
    id: 'sd-card',
    title: 'SD kart',
    subtitle: 'Harici depolama yuvası',
    usedLabel: '0 GB',
    totalLabel: '64 GB',
    usageRatio: 0,
    icon: 'sd-card',
  },
  {
    id: 'usb',
    title: 'USB',
    subtitle: 'Bağlı OTG depolama',
    usedLabel: 'Hazır değil',
    totalLabel: '',
    usageRatio: 0,
    icon: 'downloads',
  },
];

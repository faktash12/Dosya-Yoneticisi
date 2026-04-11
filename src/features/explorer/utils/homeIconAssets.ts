import type {ImageSourcePropType} from 'react-native';

import appsIcon from '@/assets/home/apps.png';
import audioIcon from '@/assets/home/audio.png';
import cloudIcon from '@/assets/home/cloud.png';
import documentsIcon from '@/assets/home/documents.png';
import imagesIcon from '@/assets/home/images.png';
import recentIcon from '@/assets/home/recent.png';
import videoIcon from '@/assets/home/video.png';
import instagramIcon from '@/assets/social/instagram.png';
import telegramIcon from '@/assets/social/telegram.png';
import whatsappIcon from '@/assets/social/whatsapp.png';
import type {ExplorerShortcutItem} from '@/features/explorer/types/explorer.types';

export const shortcutIconAssets: Partial<
  Record<ExplorerShortcutItem['icon'] | 'downloads' | 'archive' | 'apk', ImageSourcePropType>
> = {
  images: imagesIcon,
  video: videoIcon,
  documents: documentsIcon,
  apps: appsIcon,
  recent: recentIcon,
  cloud: cloudIcon,
  audio: audioIcon,
  whatsapp: whatsappIcon,
  telegram: telegramIcon,
  instagram: instagramIcon,
};

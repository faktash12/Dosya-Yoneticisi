import {
  FolderSearch,
  HardDriveDownload,
  Star,
  UploadCloud,
} from 'lucide-react-native';

export const explorerQuickActions = [
  {
    id: 'search',
    label: 'Ara',
    icon: FolderSearch,
  },
  {
    id: 'recents',
    label: 'Son Kullanilan',
    icon: HardDriveDownload,
  },
  {
    id: 'favorites',
    label: 'Favoriler',
    icon: Star,
  },
  {
    id: 'connect',
    label: 'Cloud',
    icon: UploadCloud,
  },
] as const;


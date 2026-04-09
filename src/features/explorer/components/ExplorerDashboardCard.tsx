import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import {
  AppWindow,
  Cloud,
  FileImage,
  FileText,
  FolderArchive,
  HardDrive,
  Image as ImageIcon,
  MonitorSmartphone,
  Network,
  Package,
  RadioTower,
  Trash2,
  Video,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import type {
  ExplorerDashboardIcon,
  ExplorerDashboardItem,
} from '@/features/explorer/types/explorer.types';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerDashboardCardProps {
  item: ExplorerDashboardItem;
  onPress: (item: ExplorerDashboardItem) => void;
}

const iconMap: Record<ExplorerDashboardIcon, typeof HardDrive> = {
  storage: HardDrive,
  system: MonitorSmartphone,
  downloads: FolderArchive,
  images: ImageIcon,
  audio: RadioTower,
  video: Video,
  documents: FileText,
  apps: Package,
  recent: AppWindow,
  cloud: Cloud,
  remote: Cloud,
  network: Network,
  trash: Trash2,
};

export const ExplorerDashboardCard = ({
  item,
  onPress,
}: ExplorerDashboardCardProps): React.JSX.Element => {
  const theme = useAppTheme();
  const Icon = iconMap[item.icon] ?? FileImage;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onPress(item)}
      style={{
        flexBasis: '48.5%',
        flexGrow: 1,
        borderRadius: theme.radii.xl,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        minHeight: 196,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.xl,
        shadowColor: '#000000',
        shadowOffset: {width: 0, height: 12},
        shadowOpacity: theme.mode === 'dark' ? 0.2 : 0.08,
        shadowRadius: 16,
        elevation: 3,
      }}>
      <View
        style={{
          alignSelf: 'center',
          borderRadius: theme.radii.xl,
          backgroundColor: theme.colors.primaryMuted,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.lg,
        }}>
        <Icon color={theme.colors.primary} size={30} />
      </View>

      <View style={{marginTop: theme.spacing.lg, alignItems: 'center'}}>
        <AppText
          style={{fontSize: theme.typography.cardTitle, textAlign: 'center'}}
          weight="semibold">
          {item.title}
        </AppText>
        <AppText
          tone="muted"
          style={{
            marginTop: theme.spacing.sm,
            textAlign: 'center',
            fontSize: theme.typography.caption,
            lineHeight: 18,
          }}>
          {item.subtitle}
        </AppText>
      </View>
    </TouchableOpacity>
  );
};

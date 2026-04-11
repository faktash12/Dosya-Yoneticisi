import React from 'react';
import {View} from 'react-native';
import {
  AppWindow,
  Cloud,
  FileText,
  FolderArchive,
  FolderOpen,
  HardDrive,
  Image as ImageIcon,
  MonitorSmartphone,
  Network,
  Package,
  RadioTower,
  Trash2,
  Usb,
  Video,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import type {ExplorerEmptyStateIcon} from '@/features/explorer/types/explorer.types';
import {useAppTheme} from '@/hooks/useAppTheme';

interface EmptyStateProps {
  title: string;
  description: string;
  supportingText?: string;
  icon?: ExplorerEmptyStateIcon;
}

const iconMap: Record<ExplorerEmptyStateIcon, typeof FolderOpen> = {
  folder: FolderOpen,
  storage: HardDrive,
  'sd-card': HardDrive,
  usb: Usb,
  system: MonitorSmartphone,
  downloads: FolderArchive,
  images: ImageIcon,
  audio: RadioTower,
  video: Video,
  documents: FileText,
  apps: Package,
  recent: AppWindow,
  cloud: Cloud,
  whatsapp: AppWindow,
  telegram: Cloud,
  instagram: ImageIcon,
  network: Network,
  trash: Trash2,
};

export const EmptyState = ({
  title,
  description,
  supportingText,
  icon = 'folder',
}: EmptyStateProps): React.JSX.Element => {
  const theme = useAppTheme();
  const Icon = iconMap[icon] ?? FolderOpen;

  return (
    <SectionCard>
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: theme.spacing.xl,
        }}>
        <View
          style={{
            marginBottom: theme.spacing.md,
            borderRadius: theme.radii.xl,
            backgroundColor: theme.colors.primaryMuted,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.lg,
          }}>
          <Icon color={theme.colors.primary} size={34} />
        </View>
        <AppText
          style={{fontSize: theme.typography.heading, textAlign: 'center'}}
          weight="semibold">
          {title}
        </AppText>
        <AppText
          tone="muted"
          style={{
            marginTop: theme.spacing.sm,
            textAlign: 'center',
            maxWidth: 300,
          }}>
          {description}
        </AppText>
        {supportingText ? (
          <AppText
            tone="muted"
            style={{
              marginTop: theme.spacing.md,
              textAlign: 'center',
              maxWidth: 280,
              fontSize: theme.typography.caption,
            }}>
            {supportingText}
          </AppText>
        ) : null}
      </View>
    </SectionCard>
  );
};

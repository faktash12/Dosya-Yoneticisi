import React from 'react';
import {Pressable, View} from 'react-native';
import {
  AppWindow,
  Cloud,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Music,
  Network,
  Package,
  ServerCog,
  Video,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import type {ExplorerShortcutItem} from '@/features/explorer/types/explorer.types';
import {useAppTheme} from '@/hooks/useAppTheme';

interface CategoryShortcutCardProps {
  item: ExplorerShortcutItem;
  onPress: (itemId: ExplorerShortcutItem['id']) => void;
  width?: number;
}

const iconMap = {
  images: ImageIcon,
  audio: Music,
  video: Video,
  documents: FileText,
  apps: Package,
  recent: AppWindow,
  cloud: Cloud,
  remote: ServerCog,
  network: Network,
} as const;

const iconToneMap = {
  images: {
    backgroundColor: '#FCE7F3',
    iconColor: '#BE185D',
  },
  audio: {
    backgroundColor: '#E0E7FF',
    iconColor: '#4338CA',
  },
  video: {
    backgroundColor: '#FEE2E2',
    iconColor: '#DC2626',
  },
  documents: {
    backgroundColor: '#FFEDD5',
    iconColor: '#EA580C',
  },
  apps: {
    backgroundColor: '#DCFCE7',
    iconColor: '#16A34A',
  },
  recent: {
    backgroundColor: '#DBEAFE',
    iconColor: '#2563EB',
  },
  cloud: {
    backgroundColor: '#ECFEFF',
    iconColor: '#0F766E',
  },
  remote: {
    backgroundColor: '#EDE9FE',
    iconColor: '#7C3AED',
  },
  network: {
    backgroundColor: '#F3F4F6',
    iconColor: '#374151',
  },
} as const;

export const CategoryShortcutCard = ({
  item,
  onPress,
  width,
}: CategoryShortcutCardProps): React.JSX.Element => {
  const theme = useAppTheme();
  const Icon = iconMap[item.icon as keyof typeof iconMap] ?? HardDrive;
  const iconTone =
    iconToneMap[item.icon as keyof typeof iconToneMap] ??
    {
      backgroundColor: theme.colors.primaryMuted,
      iconColor: theme.colors.primary,
    };

  return (
    <Pressable onPress={() => onPress(item.id)} style={width ? {width} : {width: '31%'}}>
      {({pressed}) => (
        <SectionCard
          style={{
            minHeight: 102,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
            opacity: pressed ? 0.9 : 1,
          }}>
          <View
            style={{
              borderRadius: theme.radii.lg,
              backgroundColor: iconTone.backgroundColor,
              padding: theme.spacing.md,
            }}>
            <Icon color={iconTone.iconColor} size={20} />
          </View>

          <View style={{marginTop: theme.spacing.md}}>
            <AppText
              style={{
                fontSize: theme.typography.caption + 1,
                lineHeight: 18,
                textAlign: 'center',
              }}
              weight="semibold">
              {item.title}
            </AppText>
          </View>
        </SectionCard>
      )}
    </Pressable>
  );
};

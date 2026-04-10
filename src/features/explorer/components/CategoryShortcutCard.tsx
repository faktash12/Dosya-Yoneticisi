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
    backgroundColor: '#FDF2F8',
    iconColor: '#DB2777',
  },
  audio: {
    backgroundColor: '#EEF2FF',
    iconColor: '#4F46E5',
  },
  video: {
    backgroundColor: '#FEF2F2',
    iconColor: '#DC2626',
  },
  documents: {
    backgroundColor: '#FFF7ED',
    iconColor: '#F97316',
  },
  apps: {
    backgroundColor: '#F0FDF4',
    iconColor: '#16A34A',
  },
  recent: {
    backgroundColor: '#EFF6FF',
    iconColor: '#2563EB',
  },
  cloud: {
    backgroundColor: '#ECFEFF',
    iconColor: '#0F766E',
  },
  remote: {
    backgroundColor: '#F5F3FF',
    iconColor: '#7C3AED',
  },
  network: {
    backgroundColor: '#F8FAFC',
    iconColor: '#475569',
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
    <Pressable onPress={() => onPress(item.id)} style={width ? {width} : {width: '100%'}}>
      {({pressed}) => (
        <View
          style={{
            minHeight: 104,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.xs,
            paddingVertical: theme.spacing.sm,
            opacity: pressed ? 0.9 : 1,
          }}>
          <Icon color={iconTone.iconColor} size={45} />

          <View style={{marginTop: theme.spacing.sm, alignItems: 'center'}}>
            <AppText
              style={{
                fontSize: theme.typography.caption - 1,
                lineHeight: 16,
                textAlign: 'center',
              }}
              weight="regular">
              {item.title}
            </AppText>
            <View
              style={{
                marginTop: theme.spacing.xs,
                width: 22,
                height: 1,
                backgroundColor: iconTone.iconColor,
                opacity: 0.36,
              }}
            />
          </View>
        </View>
      )}
    </Pressable>
  );
};

import React from 'react';
import {Pressable, View} from 'react-native';
import {
  AppWindow,
  Cloud,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Network,
  Package,
  RadioTower,
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
}

const iconMap = {
  images: ImageIcon,
  audio: RadioTower,
  video: Video,
  documents: FileText,
  apps: Package,
  recent: AppWindow,
  cloud: Cloud,
  remote: ServerCog,
  network: Network,
} as const;

export const CategoryShortcutCard = ({
  item,
  onPress,
}: CategoryShortcutCardProps): React.JSX.Element => {
  const theme = useAppTheme();
  const Icon = iconMap[item.icon as keyof typeof iconMap] ?? HardDrive;

  return (
    <Pressable onPress={() => onPress(item.id)} style={{width: '31.5%'}}>
      {({pressed}) => (
        <SectionCard
          style={{
            minHeight: 116,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.lg,
            opacity: pressed ? 0.9 : 1,
          }}>
          <View
            style={{
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.primaryMuted,
              padding: theme.spacing.md,
            }}>
            <Icon color={theme.colors.primary} size={20} />
          </View>

          <View style={{marginTop: theme.spacing.md}}>
            <AppText
              style={{fontSize: theme.typography.body, lineHeight: 20, textAlign: 'center'}}
              weight="semibold">
              {item.title}
            </AppText>
          </View>
        </SectionCard>
      )}
    </Pressable>
  );
};

import React from 'react';
import {Pressable, View, type DimensionValue} from 'react-native';
import {FolderArchive, HardDrive} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import type {ExplorerStorageCardItem} from '@/features/explorer/types/explorer.types';
import {useAppTheme} from '@/hooks/useAppTheme';

interface StorageCardProps {
  item: ExplorerStorageCardItem;
  onPress: (itemId: ExplorerStorageCardItem['id']) => void;
}

const iconMap = {
  storage: HardDrive,
  'sd-card': HardDrive,
  downloads: FolderArchive,
} as const;

export const StorageCard = ({
  item,
  onPress,
}: StorageCardProps): React.JSX.Element => {
  const theme = useAppTheme();
  const Icon = iconMap[item.icon];
  const progressWidth = `${Math.max(0, Math.min(item.usageRatio, 1)) * 100}%` as DimensionValue;

  return (
    <Pressable onPress={() => onPress(item.id)}>
      {({pressed}) => (
        <SectionCard
          style={{
            opacity: pressed ? 0.9 : 1,
            padding: theme.spacing.md,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing.md,
            }}>
            <View
              style={{
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.primaryMuted,
                padding: theme.spacing.md,
              }}>
              <Icon color={theme.colors.primary} size={20} />
            </View>
            <AppText style={{fontSize: theme.typography.caption}} tone="muted">
              %{Math.round(item.usageRatio * 100)}
            </AppText>
          </View>

          <AppText style={{fontSize: theme.typography.cardTitle}} weight="semibold">
            {item.title}
          </AppText>
          <AppText
            tone="muted"
            style={{fontSize: theme.typography.caption, marginTop: theme.spacing.xs}}>
            {item.subtitle}
          </AppText>

          <View
            style={{
              height: 8,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.surfaceMuted,
              overflow: 'hidden',
              marginTop: theme.spacing.lg,
            }}>
            <View
              style={{
                width: progressWidth,
                height: '100%',
                borderRadius: theme.radii.pill,
                backgroundColor: theme.colors.primary,
              }}
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: theme.spacing.sm,
            }}>
            <AppText style={{fontSize: theme.typography.caption}} weight="semibold">
              {item.usedLabel}
            </AppText>
            <AppText style={{fontSize: theme.typography.caption}} tone="muted">
              / {item.totalLabel}
            </AppText>
          </View>
        </SectionCard>
      )}
    </Pressable>
  );
};

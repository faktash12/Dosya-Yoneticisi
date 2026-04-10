import React from 'react';
import {Pressable, View, type DimensionValue} from 'react-native';
import {FolderArchive, HardDrive, Shield, Usb} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import type {
  ExplorerExtendedHomeEntryId,
  ExplorerStorageCardItem,
} from '@/features/explorer/types/explorer.types';
import {useAppTheme} from '@/hooks/useAppTheme';

interface StorageCardProps {
  item: ExplorerStorageCardItem;
  onPress: (itemId: ExplorerExtendedHomeEntryId) => void;
  width?: number;
}

const iconMap = {
  storage: HardDrive,
  'sd-card': HardDrive,
  usb: Usb,
  system: Shield,
  downloads: FolderArchive,
} as const;

const iconToneMap = {
  storage: {
    backgroundColor: '#E6F3F1',
    iconColor: '#0F766E',
  },
  'sd-card': {
    backgroundColor: '#EEF2FF',
    iconColor: '#4F46E5',
  },
  usb: {
    backgroundColor: '#F0F9FF',
    iconColor: '#0284C7',
  },
  system: {
    backgroundColor: '#F1F5F9',
    iconColor: '#334155',
  },
  downloads: {
    backgroundColor: '#ECFDF5',
    iconColor: '#059669',
  },
} as const;

export const StorageCard = ({
  item,
  onPress,
  width,
}: StorageCardProps): React.JSX.Element => {
  const theme = useAppTheme();
  const Icon = iconMap[item.icon];
  const iconTone = item.isActive === false
    ? {
        backgroundColor: theme.colors.surfaceMuted,
        iconColor: theme.colors.textMuted,
      }
    : iconToneMap[item.icon];
  const progressWidth = `${Math.max(0, Math.min(item.usageRatio, 1)) * 100}%` as DimensionValue;

  return (
    <Pressable onPress={() => onPress(item.id)} style={width ? {width} : {width: '100%'}}>
      {({pressed}) => (
        <SectionCard
          style={{
            opacity: pressed ? 0.9 : 1,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm + 2,
          }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: theme.spacing.sm,
            }}>
            <View
              style={{
                borderRadius: theme.radii.lg,
                backgroundColor: iconTone.backgroundColor,
                padding: theme.spacing.sm + 2,
              }}>
              <Icon color={iconTone.iconColor} size={18} />
            </View>
            <AppText style={{fontSize: theme.typography.caption}} tone="muted">
              {item.totalLabel ? `%${Math.round(item.usageRatio * 100)}` : '—'}
            </AppText>
          </View>

          <AppText numberOfLines={1} style={{fontSize: theme.typography.body}} weight="semibold">
            {item.title}
          </AppText>

          <View
            style={{
              height: 6,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.surfaceMuted,
              overflow: 'hidden',
              marginTop: theme.spacing.md,
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
              marginTop: theme.spacing.sm,
            }}>
            <AppText numberOfLines={1} style={{fontSize: theme.typography.caption}} tone="muted">
              {item.usedLabel} / {item.totalLabel}
            </AppText>
          </View>
        </SectionCard>
      )}
    </Pressable>
  );
};

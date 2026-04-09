import React from 'react';
import {ScrollView, TouchableOpacity, View} from 'react-native';
import {Cloud, FolderSearch, HardDriveDownload, Star} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {ExplorerDashboardCard} from '@/features/explorer/components/ExplorerDashboardCard';
import type {ExplorerDashboardItem} from '@/features/explorer/types/explorer.types';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerDashboardProps {
  items: ExplorerDashboardItem[];
  onSelectItem: (item: ExplorerDashboardItem) => void;
  onQuickActionPress: (quickActionId: string) => void;
}

const quickActions = [
  {id: 'search', label: 'Ara', icon: FolderSearch, enabled: false},
  {id: 'recents', label: 'Son Kullanılan', icon: HardDriveDownload, enabled: false},
  {id: 'favorites', label: 'Favoriler', icon: Star, enabled: true},
  {id: 'cloud', label: 'Bulut', icon: Cloud, enabled: true},
] as const;

export const ExplorerDashboard = ({
  items,
  onSelectItem,
  onQuickActionPress,
}: ExplorerDashboardProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View>
      <SectionCard style={{marginBottom: theme.spacing.xl}}>
        <AppText
          tone="accent"
          style={{fontSize: theme.typography.caption, letterSpacing: 0.3}}
          weight="semibold">
          Explorer Dashboard
        </AppText>
        <AppText
          style={{fontSize: theme.typography.hero, marginTop: theme.spacing.sm}}
          weight="bold">
          Dosya yöneticiniz hazır.
        </AppText>
        <AppText
          tone="muted"
          style={{
            marginTop: theme.spacing.md,
            lineHeight: 22,
          }}>
          Yerel depolama, medya klasörleri ve placeholder akışları tek bir güvenli
          explorer deneyiminde toplanır.
        </AppText>
      </SectionCard>

      <View style={{marginBottom: theme.spacing.lg}}>
        <AppText style={{fontSize: theme.typography.caption}} tone="muted">
          Hızlı aksiyonlar
        </AppText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.sm,
          paddingBottom: theme.spacing.xl,
        }}>
        {quickActions.map(action => {
          const Icon = action.icon;

          return (
            <TouchableOpacity
              activeOpacity={0.88}
              disabled={!action.enabled}
              key={action.id}
              onPress={() => {
                if (action.enabled) {
                  onQuickActionPress(action.id);
                }
              }}
              style={{
                opacity: action.enabled ? 1 : 0.56,
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.sm,
                }}>
                <View
                  style={{
                    borderRadius: theme.radii.md,
                    backgroundColor: theme.colors.primaryMuted,
                    padding: theme.spacing.sm,
                  }}>
                  <Icon color={theme.colors.primary} size={16} />
                </View>
                <View>
                  <AppText style={{fontSize: theme.typography.caption}} weight="semibold">
                    {action.label}
                  </AppText>
                  <AppText style={{fontSize: theme.typography.micro}} tone="muted">
                    {action.enabled ? 'Hazır' : 'Yakında'}
                  </AppText>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={{marginBottom: theme.spacing.md}}>
        <AppText style={{fontSize: theme.typography.caption}} tone="muted">
          Ana kategoriler
        </AppText>
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
        }}>
        {items.map(item => (
          <ExplorerDashboardCard key={item.id} item={item} onPress={onSelectItem} />
        ))}
      </View>
    </View>
  );
};

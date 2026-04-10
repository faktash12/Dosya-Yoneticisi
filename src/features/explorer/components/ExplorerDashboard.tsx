import React from 'react';
import {Pressable, View} from 'react-native';
import {Menu} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {CategoryShortcutCard} from '@/features/explorer/components/CategoryShortcutCard';
import {ExplorerHomeSection} from '@/features/explorer/components/ExplorerHomeSection';
import {StorageCard} from '@/features/explorer/components/StorageCard';
import type {ExplorerHomeEntryId} from '@/features/explorer/types/explorer.types';
import {homeShortcuts} from '@/features/explorer/view-models/homeShortcuts';
import {storageCards} from '@/features/explorer/view-models/storageCards';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerDashboardProps {
  onSelectEntry: (entryId: ExplorerHomeEntryId) => void;
  onOpenDrawer: () => void;
}

export const ExplorerDashboard = ({
  onSelectEntry,
  onOpenDrawer,
}: ExplorerDashboardProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.xl,
        }}>
        <Pressable
          onPress={onOpenDrawer}
          style={{
            height: 44,
            width: 44,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Menu color={theme.colors.text} size={20} />
        </Pressable>

        <View style={{flex: 1, marginHorizontal: theme.spacing.md}}>
          <AppText style={{fontSize: theme.typography.title}} weight="bold">
            Dosya Yöneticisi
          </AppText>
        </View>
      </View>

      <ExplorerHomeSection
        description="Depolama girişlerinden doğrudan klasör görünümüne geçin."
        title="Depolama">
        <View style={{gap: theme.spacing.md}}>
          {storageCards.map(item => (
            <StorageCard key={item.id} item={item} onPress={onSelectEntry} />
          ))}
        </View>
      </ExplorerHomeSection>

      <ExplorerHomeSection
        description=""
        title="Kategoriler">
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}>
          {homeShortcuts.map(item => (
            <CategoryShortcutCard key={item.id} item={item} onPress={onSelectEntry} />
          ))}
        </View>
      </ExplorerHomeSection>
    </View>
  );
};

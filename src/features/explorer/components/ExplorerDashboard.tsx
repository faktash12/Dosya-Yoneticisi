import React from 'react';
import {View} from 'react-native';

import {CategoryShortcutCard} from '@/features/explorer/components/CategoryShortcutCard';
import {ExplorerHomeSection} from '@/features/explorer/components/ExplorerHomeSection';
import {StorageCard} from '@/features/explorer/components/StorageCard';
import type {ExplorerHomeEntryId} from '@/features/explorer/types/explorer.types';
import {homeShortcuts} from '@/features/explorer/view-models/homeShortcuts';
import {storageCards} from '@/features/explorer/view-models/storageCards';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerDashboardProps {
  onSelectEntry: (entryId: ExplorerHomeEntryId) => void;
  storageItems?: typeof storageCards;
  shortcutItems?: typeof homeShortcuts;
}

export const ExplorerDashboard = ({
  onSelectEntry,
  storageItems = storageCards,
  shortcutItems = homeShortcuts,
}: ExplorerDashboardProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View>
      <ExplorerHomeSection title="Depolama">
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'stretch',
          }}>
          {storageItems.map(item => (
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
          {shortcutItems.map(item => (
            <CategoryShortcutCard key={item.id} item={item} onPress={onSelectEntry} />
          ))}
        </View>
      </ExplorerHomeSection>
    </View>
  );
};

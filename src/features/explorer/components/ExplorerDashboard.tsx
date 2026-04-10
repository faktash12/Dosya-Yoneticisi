import React from 'react';
import {useWindowDimensions, View} from 'react-native';

import {CategoryShortcutCard} from '@/features/explorer/components/CategoryShortcutCard';
import {ExplorerHomeSection} from '@/features/explorer/components/ExplorerHomeSection';
import {StorageCard} from '@/features/explorer/components/StorageCard';
import type {
  ExplorerExtendedHomeEntryId,
  ExplorerHomeEntryId,
} from '@/features/explorer/types/explorer.types';
import {homeShortcuts} from '@/features/explorer/view-models/homeShortcuts';
import {storageCards} from '@/features/explorer/view-models/storageCards';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerDashboardProps {
  onSelectEntry: (entryId: ExplorerExtendedHomeEntryId | ExplorerHomeEntryId) => void;
  storageItems?: typeof storageCards;
  shortcutItems?: typeof homeShortcuts;
}

export const ExplorerDashboard = ({
  onSelectEntry,
  storageItems = storageCards,
  shortcutItems = homeShortcuts,
}: ExplorerDashboardProps): React.JSX.Element => {
  const theme = useAppTheme();
  const {width} = useWindowDimensions();
  const horizontalPadding = theme.spacing.md * 2;
  const gridGap = theme.spacing.md;
  const itemWidth = Math.floor((width - horizontalPadding - gridGap * 2) / 3);

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
            <StorageCard
              key={item.id}
              item={item}
              onPress={onSelectEntry}
              width={itemWidth}
            />
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
            columnGap: theme.spacing.md,
            rowGap: theme.spacing.md,
          }}>
          {shortcutItems.map(item => (
            <CategoryShortcutCard
              key={item.id}
              item={item}
              onPress={onSelectEntry}
              width={itemWidth}
            />
          ))}
        </View>
      </ExplorerHomeSection>
    </View>
  );
};

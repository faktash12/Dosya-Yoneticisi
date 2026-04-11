import React from 'react';
import {ScrollView, useWindowDimensions, View} from 'react-native';

import {CategoryShortcutCard} from '@/features/explorer/components/CategoryShortcutCard';
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
  const gridGap = theme.spacing.sm;
  const itemWidth = Math.floor((width - horizontalPadding - gridGap * 2) / 3);
  const socialShortcutItems = shortcutItems.filter(item =>
    ['whatsapp', 'telegram', 'instagram'].includes(item.id),
  );
  const primaryShortcutItems = shortcutItems.filter(
    item => !['whatsapp', 'telegram', 'instagram'].includes(item.id),
  );

  return (
    <View style={{gap: theme.spacing.lg}}>
      <View>
        <ScrollView
          horizontal
          contentContainerStyle={{gap: theme.spacing.sm}}
          showsHorizontalScrollIndicator={false}>
          {storageItems.map(item => (
            <StorageCard
              key={item.id}
              item={item}
              onPress={onSelectEntry}
              width={itemWidth}
            />
          ))}
        </ScrollView>
      </View>

      <View>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            marginHorizontal: -(gridGap / 2),
          }}>
          {primaryShortcutItems.map(item => (
            <View
              key={item.id}
              style={{
                width: '33.333%',
                paddingHorizontal: gridGap / 2,
                marginBottom: theme.spacing.sm,
              }}>
              <CategoryShortcutCard
                item={item}
                onPress={onSelectEntry}
              />
            </View>
          ))}
        </View>
      </View>

      {socialShortcutItems.length > 0 ? (
        <View>
          <View
            style={{
              height: 1,
              backgroundColor: theme.colors.border,
              marginBottom: theme.spacing.md,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginHorizontal: -(gridGap / 2),
            }}>
            {socialShortcutItems.map(item => (
              <View
                key={item.id}
                style={{
                  width: '33.333%',
                  paddingHorizontal: gridGap / 2,
                  marginBottom: theme.spacing.sm,
                }}>
                <CategoryShortcutCard item={item} onPress={onSelectEntry} />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};

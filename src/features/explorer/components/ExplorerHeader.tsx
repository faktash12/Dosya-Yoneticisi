import React from 'react';
import {Pressable, View} from 'react-native';
import {ArrowUp, Copy, Scissors} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerHeaderProps {
  currentPathLabel: string;
  selectedCount: number;
  canGoBack: boolean;
  onGoBack: () => void;
  onCopySelection: () => void;
  onCutSelection: () => void;
}

export const ExplorerHeader = ({
  currentPathLabel,
  selectedCount,
  canGoBack,
  onGoBack,
  onCopySelection,
  onCutSelection,
}: ExplorerHeaderProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <SectionCard style={{marginBottom: theme.spacing.lg}}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
        <View style={{flex: 1}}>
          <AppText style={{fontSize: theme.typography.title}} weight="bold">
            Explorer
          </AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            {currentPathLabel}
          </AppText>
        </View>
        <Pressable
          disabled={!canGoBack}
          onPress={onGoBack}
          style={{
            opacity: canGoBack ? 1 : 0.4,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceMuted,
            padding: theme.spacing.md,
          }}>
          <ArrowUp color={theme.colors.text} size={18} />
        </Pressable>
      </View>

      <View
        style={{
          marginTop: theme.spacing.lg,
          gap: theme.spacing.md,
        }}>
        <AppText tone="muted">
          {selectedCount > 0
            ? `${selectedCount} öğe seçildi`
            : 'Uzun basarak çoklu seçim moduna girebilirsiniz'}
        </AppText>
        <View style={{flexDirection: 'row', gap: theme.spacing.sm}}>
          <Pressable
            disabled={selectedCount === 0}
            onPress={onCopySelection}
            style={{
              opacity: selectedCount === 0 ? 0.45 : 1,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.primaryMuted,
              padding: theme.spacing.md,
            }}>
            <Copy color={theme.colors.primary} size={18} />
          </Pressable>
          <Pressable
            disabled={selectedCount === 0}
            onPress={onCutSelection}
            style={{
              opacity: selectedCount === 0 ? 0.45 : 1,
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.surfaceMuted,
              padding: theme.spacing.md,
            }}>
            <Scissors color={theme.colors.text} size={18} />
          </Pressable>
        </View>
      </View>
    </SectionCard>
  );
};

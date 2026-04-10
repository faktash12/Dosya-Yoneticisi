import React from 'react';
import {Pressable, View} from 'react-native';
import {ArrowLeft, Copy, Menu, Scissors} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerHeaderProps {
  currentPath: string;
  currentPathLabel: string;
  selectedCount: number;
  canGoBack: boolean;
  onOpenDrawer: () => void;
  onGoBack: () => void;
  onCopySelection: () => void;
  onCutSelection: () => void;
}

export const ExplorerHeader = ({
  currentPath,
  currentPathLabel,
  selectedCount,
  canGoBack,
  onOpenDrawer,
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
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.md,
        }}>
        <View style={{flexDirection: 'row', flex: 1, gap: theme.spacing.sm}}>
          <Pressable
            onPress={onOpenDrawer}
            hitSlop={8}
            style={{
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surfaceMuted,
              padding: theme.spacing.md,
            }}>
            <Menu color={theme.colors.text} size={18} />
          </Pressable>
          <Pressable
            disabled={!canGoBack}
            onPress={onGoBack}
            hitSlop={8}
            style={{
              opacity: canGoBack ? 1 : 0.42,
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surfaceMuted,
              padding: theme.spacing.md,
            }}>
            <ArrowLeft color={theme.colors.text} size={18} />
          </Pressable>

          <View style={{flex: 1}}>
            <AppText
              style={{fontSize: theme.typography.heading}}
              weight="bold">
              {currentPathLabel}
            </AppText>
            <AppText
              tone="muted"
              style={{fontSize: theme.typography.caption, marginTop: theme.spacing.xs}}>
              {currentPath}
            </AppText>
          </View>
        </View>

        <View style={{flexDirection: 'row', gap: theme.spacing.sm}}>
          <Pressable
            disabled={selectedCount === 0}
            onPress={onCopySelection}
            style={{
              opacity: selectedCount === 0 ? 0.45 : 1,
              borderRadius: theme.radii.lg,
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
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surfaceMuted,
              padding: theme.spacing.md,
            }}>
            <Scissors color={theme.colors.text} size={18} />
          </Pressable>
        </View>
      </View>

      <AppText
        tone="muted"
        style={{fontSize: theme.typography.caption, marginTop: theme.spacing.md}}>
        {selectedCount > 0
          ? `${selectedCount} öğe seçildi`
          : 'Klasörleri açmak için dokunun, çoklu seçim için uzun basın.'}
      </AppText>
    </SectionCard>
  );
};

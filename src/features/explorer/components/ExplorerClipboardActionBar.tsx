import React from 'react';
import {Pressable, View} from 'react-native';
import {ClipboardPaste, X} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerClipboardActionBarProps {
  itemCount: number;
  mode: 'copy' | 'cut';
  onPaste: () => void;
  onClear: () => void;
}

export const ExplorerClipboardActionBar = ({
  itemCount,
  mode,
  onPaste,
  onClear,
}: ExplorerClipboardActionBarProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
        paddingTop: theme.spacing.md,
      }}>
      <View style={{flex: 1}}>
        <AppText weight="semibold">
          {mode === 'copy' ? 'Kopyalama' : 'Taşıma'} için {itemCount} öğe hazır
        </AppText>
        <AppText
          tone="muted"
          style={{fontSize: theme.typography.caption, marginTop: theme.spacing.xs}}>
          Yeni klasöre gidip yapıştırarak işlemi tamamlayabilirsiniz.
        </AppText>
      </View>

      <View style={{flexDirection: 'row', gap: theme.spacing.sm}}>
        <Pressable
          onPress={onPaste}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.xs,
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
          }}>
          <ClipboardPaste color="#FFFFFF" size={16} />
          <AppText style={{color: '#FFFFFF'}} weight="semibold">
            Yapıştır
          </AppText>
        </Pressable>
        <Pressable
          onPress={onClear}
          style={{
            borderRadius: theme.radii.lg,
            backgroundColor: theme.colors.surfaceMuted,
            padding: theme.spacing.sm,
          }}>
          <X color={theme.colors.text} size={16} />
        </Pressable>
      </View>
    </View>
  );
};

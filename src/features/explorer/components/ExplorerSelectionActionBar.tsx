import React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {
  Copy,
  EyeOff,
  FilePlus2,
  FolderOpen,
  MoveRight,
  Send,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerSelectionActionBarProps {
  selectedCount: number;
  onHide: () => void;
  onShare: () => void;
  onOpenWith: () => void;
  onCreateFile: () => void;
  onCopy: () => void;
  onMove: () => void;
}

interface ActionButtonProps {
  label: string;
  icon: React.ComponentType<{color: string; size?: number}>;
  onPress: () => void;
}

const ActionButton = ({
  label,
  icon: Icon,
  onPress,
}: ActionButtonProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => ({
        minWidth: 86,
        borderRadius: theme.radii.lg,
        borderWidth: 1,
        borderColor: pressed ? theme.colors.primary : theme.colors.border,
        backgroundColor: pressed
          ? theme.colors.primaryMuted
          : theme.colors.surface,
        alignItems: 'center',
        gap: theme.spacing.xs,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
      })}>
      <Icon color={theme.colors.primary} size={18} />
      <AppText
        style={{fontSize: theme.typography.caption, textAlign: 'center'}}
        weight="semibold">
        {label}
      </AppText>
    </Pressable>
  );
};

export const ExplorerSelectionActionBar = ({
  selectedCount,
  onHide,
  onShare,
  onOpenWith,
  onCreateFile,
  onCopy,
  onMove,
}: ExplorerSelectionActionBarProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.lg,
        paddingTop: theme.spacing.md,
      }}>
      <AppText weight="semibold">{selectedCount} öğe seçildi</AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: theme.spacing.sm,
          paddingTop: theme.spacing.md,
          paddingRight: theme.spacing.md,
        }}>
        <ActionButton icon={EyeOff} label="Gizle" onPress={onHide} />
        <ActionButton icon={Send} label="Gönder" onPress={onShare} />
        <ActionButton icon={FolderOpen} label="Birlikte aç" onPress={onOpenWith} />
        <ActionButton
          icon={FilePlus2}
          label="Yeni dosya oluştur"
          onPress={onCreateFile}
        />
        <ActionButton icon={Copy} label="Kopya" onPress={onCopy} />
        <ActionButton icon={MoveRight} label="Taşı" onPress={onMove} />
      </ScrollView>
    </View>
  );
};

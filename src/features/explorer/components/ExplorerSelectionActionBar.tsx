import React from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {
  Archive,
  Copy,
  EyeOff,
  ExternalLink,
  Pencil,
  FolderOpen,
  RotateCcw,
  Scissors,
  Send,
  Star,
  Trash2,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerSelectionActionBarProps {
  selectedCount: number;
  isTrashView?: boolean;
  onPrimaryAction: () => void;
  onDelete: () => void;
  onShare: () => void;
  onOpenWith: () => void;
  onRename: () => void;
  onCopy: () => void;
  onMove: () => void;
  onAddFavorite: () => void;
  onSelectAll?: () => void;
  onGoToFolder?: () => void;
  onExtractArchive?: () => void;
  canGoToFolder?: boolean;
  canExtractArchive?: boolean;
}

interface ActionButtonProps {
  label: string;
  icon: React.ComponentType<{color: string; size?: number}>;
  onPress: () => void;
  showSeparator?: boolean;
}

const ActionButton = ({
  label,
  icon: Icon,
  onPress,
  showSeparator = true,
}: ActionButtonProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Pressable
        onPress={onPress}
        style={({pressed}) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.xs,
          opacity: pressed ? 0.72 : 1,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
        })}>
        <Icon color={theme.colors.primary} size={16} />
        <AppText style={{fontSize: theme.typography.caption}} weight="semibold">
          {label}
        </AppText>
      </Pressable>
      {showSeparator ? (
        <View
          style={{
            height: 18,
            width: 1,
            backgroundColor: theme.colors.border,
            marginHorizontal: theme.spacing.xs,
          }}
        />
      ) : null}
    </View>
  );
};

export const ExplorerSelectionActionBar = ({
  selectedCount,
  isTrashView = false,
  onPrimaryAction,
  onDelete,
  onShare,
  onOpenWith,
  onRename,
  onCopy,
  onMove,
  onAddFavorite,
  onSelectAll,
  onGoToFolder,
  onExtractArchive,
  canGoToFolder = false,
  canExtractArchive = false,
}: ExplorerSelectionActionBarProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        paddingTop: theme.spacing.sm,
      }}>
      <AppText style={{fontSize: theme.typography.caption}} weight="semibold">
        {selectedCount} öğe seçildi
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: 'center',
          paddingTop: theme.spacing.sm,
          paddingRight: theme.spacing.md,
        }}>
        {isTrashView && onSelectAll ? (
          <ActionButton icon={Copy} label="Tümünü Seç" onPress={onSelectAll} />
        ) : null}
        <ActionButton icon={Trash2} label="Sil" onPress={onDelete} />
        <ActionButton
          icon={isTrashView ? RotateCcw : EyeOff}
          label={isTrashView ? 'Geri yükle' : 'Gizle'}
          onPress={onPrimaryAction}
          showSeparator={!isTrashView}
        />
        {!isTrashView ? (
          <>
            {canGoToFolder && onGoToFolder ? (
              <ActionButton icon={FolderOpen} label="Klasöre Git" onPress={onGoToFolder} />
            ) : null}
            {canExtractArchive && onExtractArchive ? (
              <ActionButton icon={Archive} label="Klasöre Çıkar" onPress={onExtractArchive} />
            ) : null}
            <ActionButton icon={Send} label="Gönder" onPress={onShare} />
            <ActionButton icon={ExternalLink} label="Birlikte Aç" onPress={onOpenWith} />
            <ActionButton icon={Pencil} label="Adlandır" onPress={onRename} />
            <ActionButton icon={Star} label="Favori" onPress={onAddFavorite} />
            <ActionButton icon={Copy} label="Kopya" onPress={onCopy} />
            <ActionButton
              icon={Scissors}
              label="Taşı"
              onPress={onMove}
              showSeparator={false}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
};

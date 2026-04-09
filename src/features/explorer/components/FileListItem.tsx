import React, {memo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Check, ChevronRight, File, Folder} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useAppTheme} from '@/hooks/useAppTheme';
import {formatBytes} from '@/utils/formatBytes';
import {formatRelativeDate} from '@/utils/formatRelativeDate';

interface FileListItemProps {
  node: FileSystemNode;
  selected: boolean;
  onPress: (node: FileSystemNode) => void;
  onLongPress: (node: FileSystemNode) => void;
}

const FileListItemComponent = ({
  node,
  selected,
  onPress,
  onLongPress,
}: FileListItemProps): React.JSX.Element => {
  const theme = useAppTheme();
  const isDirectory = node.kind === 'directory';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      delayLongPress={220}
      onPress={() => onPress(node)}
      onLongPress={() => onLongPress(node)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: theme.radii.xl,
        borderWidth: 1,
        borderColor: selected ? theme.colors.primary : theme.colors.border,
        backgroundColor: selected
          ? theme.colors.primaryMuted
          : theme.colors.surface,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
      }}>
      <View
        style={{
          marginRight: theme.spacing.md,
          borderRadius: theme.radii.lg,
          backgroundColor: isDirectory
            ? theme.colors.surfaceMuted
            : theme.colors.primaryMuted,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
        }}>
        {isDirectory ? (
          <Folder color={theme.colors.text} size={20} />
        ) : (
          <File color={theme.colors.primary} size={20} />
        )}
      </View>

      <View style={{flex: 1}}>
        <AppText style={{fontSize: theme.typography.body}} weight="semibold">
          {node.name}
        </AppText>
        <AppText
          tone="muted"
          style={{
            marginTop: theme.spacing.xs,
            fontSize: theme.typography.caption,
          }}>
          {isDirectory
            ? `${node.childCount ?? 0} öğe`
            : formatBytes(node.sizeBytes)}
          {'  '}•{'  '}
          {formatRelativeDate(node.modifiedAt)}
        </AppText>
      </View>

      <View
        style={{
          height: 30,
          width: 30,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radii.pill,
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surfaceMuted,
        }}>
        {selected ? (
          <Check color="#FFFFFF" size={16} />
        ) : isDirectory ? (
          <ChevronRight color={theme.colors.textMuted} size={16} />
        ) : (
          <View
            style={{
              height: 10,
              width: 10,
              borderRadius: theme.radii.pill,
              backgroundColor: theme.colors.border,
            }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
};

export const FileListItem = memo(
  FileListItemComponent,
  (previousProps, nextProps) =>
    previousProps.node.id === nextProps.node.id &&
    previousProps.node.name === nextProps.node.name &&
    previousProps.node.modifiedAt === nextProps.node.modifiedAt &&
    previousProps.node.sizeBytes === nextProps.node.sizeBytes &&
    previousProps.node.childCount === nextProps.node.childCount &&
    previousProps.selected === nextProps.selected,
);

import React, {memo} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {Check, ChevronRight} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useAppTheme} from '@/hooks/useAppTheme';
import {formatBytes} from '@/utils/formatBytes';
import {formatAbsoluteDateTime} from '@/utils/formatAbsoluteDate';
import {renderNodeTypeIcon} from '@/features/explorer/utils/fileTypeIcons';

interface FileListItemProps {
  node: FileSystemNode;
  selected: boolean;
  onPress: (node: FileSystemNode) => void;
  onLongPress: (node: FileSystemNode) => void;
  leftMetaOverride?: string;
  rightMetaOverride?: string;
  density?: 'details' | 'compact';
}

const FileListItemComponent = ({
  node,
  selected,
  onPress,
  onLongPress,
  leftMetaOverride,
  rightMetaOverride,
  density = 'details',
}: FileListItemProps): React.JSX.Element => {
  const theme = useAppTheme();
  const isDirectory = node.kind === 'directory';
  const isCompact = density === 'compact';

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      delayLongPress={220}
      onPress={() => onPress(node)}
      onLongPress={() => onLongPress(node)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: selected
          ? theme.colors.primaryMuted
          : theme.colors.surface,
        paddingHorizontal: isCompact ? theme.spacing.md : theme.spacing.lg,
        paddingVertical: isCompact ? theme.spacing.sm : theme.spacing.md,
      }}>
      <View
        style={{
          marginRight: theme.spacing.md,
          borderRadius: theme.radii.md,
          backgroundColor: isDirectory
            ? theme.colors.surfaceMuted
            : theme.colors.primaryMuted,
          paddingHorizontal: isCompact ? theme.spacing.sm : theme.spacing.md,
          paddingVertical: isCompact ? theme.spacing.sm : theme.spacing.md,
        }}>
        {renderNodeTypeIcon(node, {
          size: isCompact ? 18 : 20,
          directoryColor: theme.colors.text,
          fileColor: theme.colors.primary,
        })}
      </View>

      <View style={{flex: 1, paddingRight: theme.spacing.md}}>
        <AppText
          style={{
            fontSize: isCompact ? theme.typography.caption : theme.typography.body - 1,
          }}
          weight="regular">
          {node.name}
        </AppText>
        <View
          style={{
            marginTop: theme.spacing.xs,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}>
          <AppText
            numberOfLines={1}
            tone="muted"
            style={{
              flex: 1,
              fontSize: isCompact ? theme.typography.caption - 1 : theme.typography.caption,
            }}>
            {leftMetaOverride ??
              (isDirectory
                ? `${node.childCount ?? 0} öğe`
                : formatBytes(node.sizeBytes).toLowerCase())}
          </AppText>
          <AppText
            tone="muted"
            style={{
              fontSize: theme.typography.caption,
              textAlign: 'right',
            }}>
            {rightMetaOverride ?? formatAbsoluteDateTime(node.modifiedAt)}
          </AppText>
        </View>
      </View>

      <View
        style={{
          height: 30,
          width: 30,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radii.md,
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surfaceMuted,
        }}>
        {selected ? (
          <Check color="#FFFFFF" size={16} />
        ) : isDirectory ? (
          <ChevronRight color={theme.colors.textMuted} size={16} />
        ) : null}
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
    previousProps.selected === nextProps.selected &&
    previousProps.leftMetaOverride === nextProps.leftMetaOverride &&
    previousProps.rightMetaOverride === nextProps.rightMetaOverride &&
    previousProps.density === nextProps.density,
);

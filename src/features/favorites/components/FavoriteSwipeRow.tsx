import React from 'react';
import {TouchableOpacity, View} from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import {Trash2} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {FileListItem} from '@/features/explorer/components/FileListItem';
import {useAppTheme} from '@/hooks/useAppTheme';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

interface FavoriteSwipeRowProps {
  item: FileSystemNode;
  onOpen: (item: FileSystemNode) => void;
  onRemove: (item: FileSystemNode) => void;
}

export const FavoriteSwipeRow = ({
  item,
  onOpen,
  onRemove,
}: FavoriteSwipeRowProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <View
      style={{
        borderRadius: theme.radii.xl,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
      }}>
      <Swipeable
        friction={2}
        rightThreshold={44}
        overshootRight={false}
        renderRightActions={() => (
          <View
            style={{
              width: 96,
              height: '100%',
              backgroundColor: theme.colors.danger,
            }}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => onRemove(item)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: theme.colors.danger,
              }}>
              <Trash2 color="#FFFFFF" size={18} />
              <AppText
                style={{
                  color: '#FFFFFF',
                  marginTop: theme.spacing.xs,
                  fontSize: theme.typography.caption,
                }}
                weight="semibold">
                Sil
              </AppText>
            </TouchableOpacity>
          </View>
        )}>
        <FileListItem
          node={item}
          onLongPress={() => undefined}
          onPress={onOpen}
          selected={false}
        />
      </Swipeable>
    </View>
  );
};

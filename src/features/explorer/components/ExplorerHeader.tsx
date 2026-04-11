import React from 'react';
import {Pressable, ScrollView, TextInput, View} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  EllipsisVertical,
  Home,
  Menu,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerHeaderProps {
  title: string;
  segments?: string[];
  isSearchOpen: boolean;
  searchQuery: string;
  searchPlaceholder?: string;
  onChangeSearchQuery: (value: string) => void;
  onOpenDrawer: () => void;
  onNavigateBack?: () => void;
  onToggleSearch: () => void;
  onToggleSortMenu: () => void;
  onToggleMoreMenu: () => void;
  onClearSearch: () => void;
  onPressSegment?: (index: number) => void;
}

export const ExplorerHeader = ({
  title,
  segments,
  isSearchOpen,
  searchQuery,
  searchPlaceholder = 'Bu klasörde ara',
  onChangeSearchQuery,
  onOpenDrawer,
  onNavigateBack,
  onToggleSearch,
  onToggleSortMenu,
  onToggleMoreMenu,
  onClearSearch,
  onPressSegment,
}: ExplorerHeaderProps): React.JSX.Element => {
  const theme = useAppTheme();
  const hasSegments = (segments?.length ?? 0) > 0;

  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
        }}>
        <View style={{flexDirection: 'row', alignItems: 'center', flex: 1, gap: theme.spacing.sm}}>
          <Pressable
            hitSlop={8}
            onPress={onNavigateBack ?? onOpenDrawer}
            style={{
              paddingVertical: theme.spacing.sm,
              paddingRight: theme.spacing.xs,
            }}>
            {onNavigateBack ? (
              <ArrowLeft color={theme.colors.text} size={18} />
            ) : (
              <Menu color={theme.colors.text} size={18} />
            )}
          </Pressable>

          {hasSegments ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                paddingRight: theme.spacing.md,
              }}>
              <Home color={theme.colors.primary} size={16} />
              {segments?.map((segment, index) => (
                <View
                  key={`${segment}-${index}`}
                  style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs}}>
                  <ChevronRight color={theme.colors.textMuted} size={14} />
                  <Pressable
                    disabled={!onPressSegment}
                    onPress={() => onPressSegment?.(index)}
                    style={{paddingVertical: 2}}>
                    <AppText
                      style={{
                        fontSize:
                          index === (segments?.length ?? 1) - 1
                            ? theme.typography.body
                            : theme.typography.caption,
                      }}
                      tone={
                        index === (segments?.length ?? 1) - 1 ? 'default' : 'muted'
                      }
                      weight={index === (segments?.length ?? 1) - 1 ? 'bold' : 'semibold'}>
                      {segment}
                    </AppText>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : (
            <AppText style={{fontSize: theme.typography.heading}} weight="bold">
              {title}
            </AppText>
          )}
        </View>

        <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md}}>
          <Pressable hitSlop={8} onPress={onToggleSearch}>
            <Search color={theme.colors.text} size={18} />
          </Pressable>
          <Pressable hitSlop={8} onPress={onToggleSortMenu}>
            <SlidersHorizontal color={theme.colors.text} size={18} />
          </Pressable>
          <Pressable hitSlop={8} onPress={onToggleMoreMenu}>
            <EllipsisVertical color={theme.colors.text} size={18} />
          </Pressable>
        </View>
      </View>

      {isSearchOpen ? (
        <View
          style={{
            borderTopWidth: 1,
            borderColor: theme.colors.border,
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.sm,
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}>
          <TextInput
            onChangeText={onChangeSearchQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={{
              flex: 1,
              color: theme.colors.text,
              fontSize: theme.typography.body,
              paddingVertical: theme.spacing.sm,
            }}
            value={searchQuery}
          />
          {searchQuery ? (
            <Pressable hitSlop={8} onPress={onClearSearch}>
              <X color={theme.colors.textMuted} size={18} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

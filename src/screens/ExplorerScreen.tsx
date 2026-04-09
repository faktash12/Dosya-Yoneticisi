import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {InlineError} from '@/components/feedback/InlineError';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {ExplorerHeader} from '@/features/explorer/components/ExplorerHeader';
import {FileListItem} from '@/features/explorer/components/FileListItem';
import {useExplorerController} from '@/features/explorer/hooks/useExplorerController';
import {useExplorerOperations} from '@/features/explorer/hooks/useExplorerOperations';
import {explorerQuickActions} from '@/features/explorer/view-models/explorerQuickActions';
import {useAppTheme} from '@/hooks/useAppTheme';

export const ExplorerScreen = (): React.JSX.Element => {
  const theme = useAppTheme();
  const explorer = useExplorerController();
  const operations = useExplorerOperations();

  return (
    <ScreenContainer>
      <FlatList
        data={explorer.nodes}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            <ExplorerHeader
              canGoBack={explorer.canGoBack}
              currentPathLabel={explorer.currentPathLabel}
              onCopySelection={operations.copySelection}
              onCutSelection={operations.cutSelection}
              onGoBack={explorer.goBack}
              selectedCount={explorer.selectedNodeIds.length}
            />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: theme.spacing.sm,
                paddingBottom: theme.spacing.lg,
              }}>
              {explorerQuickActions.map(action => {
                const Icon = action.icon;

                return (
                  <Pressable
                    key={action.id}
                    style={{
                      borderRadius: theme.radii.lg,
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      paddingHorizontal: theme.spacing.lg,
                      paddingVertical: theme.spacing.md,
                    }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                      }}>
                      <Icon color={theme.colors.primary} size={18} />
                      <AppText weight="semibold">{action.label}</AppText>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {operations.clipboard ? (
              <SectionCard style={{marginBottom: theme.spacing.lg}}>
                <AppText weight="semibold">
                  Pano: {operations.clipboard.mode === 'copy' ? 'Kopyala' : 'Kes'}
                </AppText>
                <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
                  {operations.clipboard.items.length} oge sonraki adimda yapistirma
                  operasyonu icin hazir.
                </AppText>
                <View
                  style={{
                    marginTop: theme.spacing.md,
                    flexDirection: 'row',
                    gap: theme.spacing.sm,
                  }}>
                  <Pressable
                    onPress={() => {
                      void operations.pasteIntoCurrentFolder();
                    }}
                    style={{
                      borderRadius: theme.radii.md,
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                    }}>
                    <AppText style={{color: '#FFFFFF'}} weight="semibold">
                      Yapistir
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={operations.clearClipboard}
                    style={{
                      borderRadius: theme.radii.md,
                      backgroundColor: theme.colors.surfaceMuted,
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: theme.spacing.sm,
                    }}>
                    <AppText weight="semibold">Temizle</AppText>
                  </Pressable>
                </View>
              </SectionCard>
            ) : null}

            {explorer.errorMessage ? (
              <InlineError message={explorer.errorMessage} />
            ) : null}

            <View style={{marginBottom: theme.spacing.md}} />
          </>
        }
        ItemSeparatorComponent={() => <View style={{height: theme.spacing.sm}} />}
        renderItem={({item}) => (
          <FileListItem
            node={item}
            onLongPress={explorer.toggleSelection}
            onPress={explorer.openNode}
            selected={explorer.selectedNodeIds.includes(item.id)}
          />
        )}
        ListEmptyComponent={
          explorer.isLoading ? (
            <View style={{paddingVertical: theme.spacing.xxl}}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <SectionCard>
              <AppText weight="semibold">Bu klasor bos</AppText>
              <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
                Gercek dosya sistemi adapteri eklendiginde bu ekran native katmandan
                beslenecek.
              </AppText>
            </SectionCard>
          )
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: theme.spacing.xxl}}
      />
    </ScreenContainer>
  );
};

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';

import {appContainer} from '@/app/di/container';
import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {EmptyState} from '@/components/feedback/EmptyState';
import {InlineError} from '@/components/feedback/InlineError';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useCloudStore} from '@/features/cloud/store/cloud.store';
import {ExplorerDashboard} from '@/features/explorer/components/ExplorerDashboard';
import {ExplorerDiagnosticsPanel} from '@/features/explorer/components/ExplorerDiagnosticsPanel';
import {ExplorerHeader} from '@/features/explorer/components/ExplorerHeader';
import {ExplorerPlaceholderView} from '@/features/explorer/components/ExplorerPlaceholderView';
import {ExplorerSideDrawer} from '@/features/explorer/components/ExplorerSideDrawer';
import {FileListItem} from '@/features/explorer/components/FileListItem';
import {FilePreviewView} from '@/features/explorer/components/FilePreviewView';
import {StorageAccessPrompt} from '@/features/explorer/components/StorageAccessPrompt';
import {useExplorerController} from '@/features/explorer/hooks/useExplorerController';
import {useExplorerOperations} from '@/features/explorer/hooks/useExplorerOperations';
import type {ExplorerHomeEntryId} from '@/features/explorer/types/explorer.types';
import {
  createUnsupportedCategoryPlaceholder,
  resolveExplorerCategoryAction,
} from '@/features/explorer/view-models/explorerCategoryActionResolver';
import {useFavoritesStore} from '@/features/favorites/store/favorites.store';
import {useAppTheme} from '@/hooks/useAppTheme';
import {appDiagnostics} from '@/services/logging/AppDiagnostics';
import {
  storagePermissionBridge,
  type StorageAccessStatus,
} from '@/services/platform/StoragePermissionBridge';

const genericDirectoryEmptyState = {
  title: 'Bu kaynakta henüz içerik yok',
  description:
    'İçerik eklendiğinde explorer burada listeler. Akış boş veya siyah ekran yerine güvenli empty state ile devam eder.',
  icon: 'folder' as const,
};

export const ExplorerScreen = (): React.JSX.Element => {
  const theme = useAppTheme();
  const explorer = useExplorerController();
  const operations = useExplorerOperations();
  const providers = useCloudStore(state => state.providers);
  const hydrateProviders = useCloudStore(state => state.hydrate);
  const favoriteItems = useFavoritesStore(state => state.items);
  const setFavoriteItems = useFavoritesStore(state => state.setItems);
  const setFavoritesLoading = useFavoritesStore(state => state.setLoading);
  const selectedIdSet = useMemo(
    () => new Set(explorer.selectedNodeIds),
    [explorer.selectedNodeIds],
  );
  const hasInitializedDiagnosticsRef = useRef(false);
  const handledClipboardJobsRef = useRef(new Set<string>());
  const [storageAccessStatus, setStorageAccessStatus] =
    React.useState<StorageAccessStatus>('unsupported');
  const [diagnosticEntries, setDiagnosticEntries] = React.useState<
    Awaited<ReturnType<typeof appDiagnostics.getEntries>>
  >([]);
  const [interactionError, setInteractionError] = React.useState<string | null>(
    null,
  );
  const [lastUserAction, setLastUserAction] = React.useState<string>(
    'Henüz kullanıcı aksiyonu yok.',
  );
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'locations' | 'favorites' | 'recent'>(
    'locations',
  );

  useEffect(() => {
    if (providers.length > 0) {
      return;
    }

    const loadProviders = async () => {
      const summaries = await appContainer.getAvailableProvidersUseCase.execute();
      hydrateProviders(summaries);
    };

    void loadProviders();
  }, [hydrateProviders, providers.length]);

  useEffect(() => {
    if (favoriteItems.length > 0) {
      return;
    }

    const loadFavorites = async () => {
      try {
        setFavoritesLoading(true);
        const favorites = await appContainer.getFavoriteNodesUseCase.execute();
        setFavoriteItems(favorites);
      } finally {
        setFavoritesLoading(false);
      }
    };

    void loadFavorites();
  }, [favoriteItems.length, setFavoriteItems, setFavoritesLoading]);

  const refreshStorageAccessStatus = useCallback(async () => {
    try {
      const status = await storagePermissionBridge.getStatus();
      setStorageAccessStatus(status);
      void appDiagnostics.recordBreadcrumb('StoragePermission', 'Status checked', {
        status,
      });
    } catch (error) {
      setStorageAccessStatus('unsupported');
      void appDiagnostics.recordError('StoragePermission', error);
    }
  }, []);

  const refreshDiagnostics = useCallback(async () => {
    const entries = await appDiagnostics.getEntries();
    setDiagnosticEntries(entries.slice(-8).reverse());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshStorageAccessStatus();
      void refreshDiagnostics();
    }, [refreshDiagnostics, refreshStorageAccessStatus]),
  );

  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        if (explorer.mode !== 'home') {
          explorer.goBack();
          return true;
        }

        return false;
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onHardwareBackPress,
      );

      return () => subscription.remove();
    }, [explorer.goBack, explorer.mode]),
  );

  useEffect(() => {
    if (hasInitializedDiagnosticsRef.current) {
      return;
    }

    hasInitializedDiagnosticsRef.current = true;
    void refreshDiagnostics();
  }, [refreshDiagnostics]);

  useEffect(() => {
    void refreshDiagnostics();
  }, [
    explorer.mode,
    explorer.currentPath,
    explorer.errorMessage,
    explorer.nodes.length,
    refreshDiagnostics,
  ]);

  useEffect(() => {
    const unsubscribe = appContainer.operationQueueProcessor.subscribe(jobs => {
      jobs.forEach(job => {
        if (
          job.metadata?.origin !== 'clipboard-paste' ||
          job.status !== 'completed' ||
          handledClipboardJobsRef.current.has(job.id)
        ) {
          return;
        }

        handledClipboardJobsRef.current.add(job.id);

        const affectsCurrentPath =
          job.destination?.path === explorer.currentPath ||
          job.sourceItems.some(sourceItem => sourceItem.path.startsWith(explorer.currentPath));

        if (affectsCurrentPath) {
          explorer.requestReload();
          setLastUserAction('Liste kopyalama veya taşıma sonrası yenilendi');
        }
      });
    });

    return unsubscribe;
  }, [explorer.currentPath, explorer.requestReload]);

  useEffect(() => {
    if (!isDrawerOpen) {
      return;
    }

    if (explorer.mode === 'browser' || explorer.mode === 'home') {
      return;
    }

    setDrawerOpen(false);
  }, [explorer.mode, isDrawerOpen]);

  const handleHomeEntryPress = useCallback(
    (entryId: ExplorerHomeEntryId) => {
      setDrawerOpen(false);
      setLastUserAction(`Ana ekran girişi: ${entryId}`);
      void appDiagnostics.recordBreadcrumb('ExplorerDashboard', 'Home entry pressed', {
        entryId,
      });

      try {
        setInteractionError(null);
        const action = resolveExplorerCategoryAction(entryId);

        if (action.kind === 'directory') {
          explorer.openBrowserPath(action.path, {
            categoryId: action.categoryId,
            emptyState: action.emptyState,
          });
          return;
        }

        explorer.openPlaceholderView(action.placeholder);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Ana ekran girişi açılamadı';

        setInteractionError(message);
        setLastUserAction(`Dashboard hata: ${message}`);
        void appDiagnostics.recordError('ExplorerDashboard', error, {
          entryId,
        });
        explorer.openPlaceholderView(
          createUnsupportedCategoryPlaceholder(entryId, message),
        );
      }
    },
    [explorer],
  );

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleDrawerLocationPress = useCallback(
    (locationId: 'home' | 'internal-storage' | 'system' | 'trash') => {
      closeDrawer();

      if (locationId === 'home') {
        explorer.openHome();
        return;
      }

      const action = resolveExplorerCategoryAction(locationId);

      if (action.kind === 'directory') {
        explorer.openBrowserPath(action.path, {
          categoryId: action.categoryId,
          emptyState: action.emptyState,
        });
        return;
      }

      explorer.openPlaceholderView(action.placeholder);
    },
    [closeDrawer, explorer],
  );

  const handleDrawerNodePress = useCallback(
    (node: (typeof explorer.recentOpenedNodes)[number]) => {
      closeDrawer();
      explorer.openNode(node);
    },
    [closeDrawer, explorer],
  );

  const renderItem = useCallback(
    ({item}: {item: (typeof explorer.nodes)[number]}) => (
      <FileListItem
        node={item}
        onLongPress={explorer.toggleSelection}
        onPress={node => {
          setInteractionError(null);
          setLastUserAction(`Liste öğesi: ${node.name}`);
          void appDiagnostics.recordBreadcrumb('ExplorerDirectory', 'Node pressed', {
            nodeId: node.id,
            path: node.path,
            kind: node.kind,
          });
          explorer.openNode(node);
        }}
        selected={selectedIdSet.has(item.id)}
      />
    ),
    [explorer.openNode, explorer.toggleSelection, selectedIdSet],
  );

  const directoryHeader = useMemo(
    () => (
      <>
        <ExplorerHeader
          canGoBack={explorer.canGoBack}
          currentPath={explorer.currentPath}
          currentPathLabel={explorer.currentPathLabel}
          onCopySelection={operations.copySelection}
          onCutSelection={operations.cutSelection}
          onOpenDrawer={openDrawer}
          onGoBack={explorer.goBack}
          selectedCount={explorer.selectedNodeIds.length}
        />

        {operations.clipboard ? (
          <SectionCard style={{marginBottom: theme.spacing.lg}}>
            <AppText weight="semibold">
              Pano: {operations.clipboard.mode === 'copy' ? 'Kopyala' : 'Kes'}
            </AppText>
            <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
              {operations.clipboard.items.length} öğe sonraki adımda yapıştırma
              operasyonu için hazır.
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
                  borderRadius: theme.radii.lg,
                  backgroundColor: theme.colors.primary,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}>
                <AppText style={{color: '#FFFFFF'}} weight="semibold">
                  Yapıştır
                </AppText>
              </Pressable>
              <Pressable
                onPress={operations.clearClipboard}
                style={{
                  borderRadius: theme.radii.lg,
                  backgroundColor: theme.colors.surfaceMuted,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}>
                <AppText weight="semibold">Temizle</AppText>
              </Pressable>
            </View>
          </SectionCard>
        ) : null}

        {explorer.errorMessage ? <InlineError message={explorer.errorMessage} /> : null}

        <View style={{marginBottom: theme.spacing.md}} />
      </>
    ),
    [
      explorer.canGoBack,
      explorer.currentPath,
      explorer.currentPathLabel,
      explorer.errorMessage,
      explorer.goBack,
      openDrawer,
      explorer.selectedNodeIds.length,
      operations.clearClipboard,
      operations.clipboard,
      operations.copySelection,
      operations.cutSelection,
      operations.pasteIntoCurrentFolder,
      theme.colors.primary,
      theme.colors.surfaceMuted,
      theme.radii.lg,
      theme.spacing.lg,
      theme.spacing.md,
      theme.spacing.sm,
      theme.spacing.xs,
    ],
  );

  const emptyComponent = useMemo(() => {
    if (explorer.isLoading) {
      return (
        <View style={{paddingVertical: theme.spacing.xxl}}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }

    if (explorer.errorMessage) {
      return (
        <EmptyState
          description={explorer.errorMessage}
          icon={explorer.activeEmptyState?.icon ?? genericDirectoryEmptyState.icon}
          supportingText="Kaynak geçici olarak açılamadı. Başka bir kategoriye dönebilir veya yeniden deneyebilirsiniz."
          title="Kaynak yüklenemedi"
        />
      );
    }

    const emptyState = explorer.activeEmptyState ?? genericDirectoryEmptyState;

    return (
      <EmptyState
        description={emptyState.description}
        icon={emptyState.icon}
        supportingText="Bu görünüm bilinçli olarak boş ekran üretmez; kategori akışı sağlıklı şekilde devam eder."
        title={emptyState.title}
      />
    );
  }, [
    explorer.activeEmptyState,
    explorer.errorMessage,
    explorer.isLoading,
    theme.colors.primary,
    theme.spacing.xxl,
  ]);

  const requestStorageAccess = useCallback(async () => {
    try {
      setInteractionError(null);
      setLastUserAction('Depolama izni ekranı açılıyor');
      await storagePermissionBridge.requestAccess();
      void appDiagnostics.recordBreadcrumb(
        'StoragePermission',
        'Opened all files access settings',
      );
      await refreshDiagnostics();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'İzin ekranı açılamadı';
      setInteractionError(message);
      setLastUserAction(`İzin hatası: ${message}`);
      void appDiagnostics.recordError('StoragePermission', error);
      await refreshDiagnostics();
    }
  }, [refreshDiagnostics]);

  const clearDiagnostics = useCallback(async () => {
    await appDiagnostics.clear();
    await refreshDiagnostics();
    setInteractionError(null);
    setLastUserAction('Tanı kayıtları temizlendi');
  }, [refreshDiagnostics]);

  const diagnosticsSummary = useMemo(
    () =>
      [
        `Mod: ${explorer.mode}`,
        `Yol: ${explorer.currentPath}`,
        `Öğe sayısı: ${explorer.nodes.length}`,
        `Yükleniyor: ${explorer.isLoading ? 'evet' : 'hayır'}`,
        `İzin: ${storageAccessStatus}`,
        `Son aksiyon: ${lastUserAction}`,
      ].join(' | '),
    [
      explorer.currentPath,
      explorer.isLoading,
      explorer.mode,
      explorer.nodes.length,
      lastUserAction,
      storageAccessStatus,
    ],
  );

  if (explorer.mode === 'home') {
    return (
      <ScreenContainer style={{paddingHorizontal: 0}}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: theme.spacing.xxl,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
          }}
          showsVerticalScrollIndicator={false}>
          {interactionError ? <InlineError message={interactionError} /> : null}
          {storageAccessStatus === 'missing' ? (
            <StorageAccessPrompt onGrantAccess={requestStorageAccess} />
          ) : null}
          <ExplorerDashboard
            onOpenDrawer={openDrawer}
            onSelectEntry={handleHomeEntryPress}
          />
        </ScrollView>
        {isDrawerOpen ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.28)',
            }}>
            <Pressable style={{flex: 1}} onPress={closeDrawer}>
              <View />
            </Pressable>
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
              }}>
              <ExplorerSideDrawer
                activeTab={drawerTab}
                favorites={favoriteItems}
                onClose={closeDrawer}
                onOpenLocation={handleDrawerLocationPress}
                onOpenNode={handleDrawerNodePress}
                onSelectTab={setDrawerTab}
                recentItems={explorer.recentOpenedNodes}
              />
            </View>
          </View>
        ) : null}
      </ScreenContainer>
    );
  }

  if (explorer.mode === 'placeholder' && explorer.placeholderView) {
    return (
      <ScreenContainer style={{paddingHorizontal: 0}}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: theme.spacing.xxl,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
          }}
          showsVerticalScrollIndicator={false}>
          {interactionError ? <InlineError message={interactionError} /> : null}
          <ExplorerPlaceholderView
            onBack={explorer.goBack}
            placeholder={explorer.placeholderView}
            providers={providers}
          />
          <ExplorerDiagnosticsPanel
            entries={diagnosticEntries}
            onClear={clearDiagnostics}
            onRefresh={() => {
              void refreshDiagnostics();
            }}
            summary={diagnosticsSummary}
          />
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (explorer.mode === 'preview' && explorer.previewNode) {
    return (
      <ScreenContainer style={{paddingHorizontal: 0}}>
        <ScrollView
          contentContainerStyle={{
            paddingBottom: theme.spacing.xxl,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
          }}
          showsVerticalScrollIndicator={false}>
          <FilePreviewView node={explorer.previewNode} onBack={explorer.goBack} />
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={{paddingHorizontal: 0, paddingTop: 0}}>
      <View style={{flex: 1}}>
        {interactionError ? <InlineError message={interactionError} /> : null}
        {storageAccessStatus === 'missing' ? (
          <StorageAccessPrompt onGrantAccess={requestStorageAccess} />
        ) : null}
        <FlatList
          key={explorer.currentPath}
          data={explorer.nodes}
          extraData={explorer.selectedNodeIds}
          keyExtractor={item => item.id}
          ListHeaderComponent={directoryHeader}
          ItemSeparatorComponent={() => <View style={{height: theme.spacing.sm}} />}
          renderItem={renderItem}
          ListEmptyComponent={emptyComponent}
          ListFooterComponent={
            <ExplorerDiagnosticsPanel
              entries={diagnosticEntries}
              onClear={clearDiagnostics}
              onRefresh={() => {
                void refreshDiagnostics();
              }}
              summary={diagnosticsSummary}
            />
          }
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          updateCellsBatchingPeriod={16}
          windowSize={5}
          removeClippedSubviews
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: theme.spacing.xxl,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
            flexGrow: 1,
          }}
        />
        {isDrawerOpen ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.28)',
            }}>
            <Pressable style={{flex: 1}} onPress={closeDrawer}>
              <View />
            </Pressable>
            <View
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
              }}>
              <ExplorerSideDrawer
                activeTab={drawerTab}
                favorites={favoriteItems}
                onClose={closeDrawer}
                onOpenLocation={handleDrawerLocationPress}
                onOpenNode={handleDrawerNodePress}
                onSelectTab={setDrawerTab}
                recentItems={explorer.recentOpenedNodes}
              />
            </View>
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
};

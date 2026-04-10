import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Pressable,
  ScrollView,
  Share,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {appContainer} from '@/app/di/container';
import type {RootStackParamList} from '@/app/navigation/types';
import {EmptyState} from '@/components/feedback/EmptyState';
import {InlineError} from '@/components/feedback/InlineError';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useCloudStore} from '@/features/cloud/store/cloud.store';
import {ExplorerClipboardActionBar} from '@/features/explorer/components/ExplorerClipboardActionBar';
import {ExplorerDashboard} from '@/features/explorer/components/ExplorerDashboard';
import {ExplorerHeader} from '@/features/explorer/components/ExplorerHeader';
import {ExplorerPlaceholderView} from '@/features/explorer/components/ExplorerPlaceholderView';
import {ExplorerSelectionActionBar} from '@/features/explorer/components/ExplorerSelectionActionBar';
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
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';
import {
  storagePermissionBridge,
  type StorageAccessStatus,
} from '@/services/platform/StoragePermissionBridge';

const genericDirectoryEmptyState = {
  title: 'Bu klasörde henüz içerik yok',
  description:
    'Bu konum şu anda boş görünüyor. Başka bir klasöre geçebilir veya yeni dosya oluşturabilirsiniz.',
  icon: 'folder' as const,
};

export const ExplorerScreen = (): React.JSX.Element => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const explorer = useExplorerController();
  const operations = useExplorerOperations();
  const providers = useCloudStore(state => state.providers);
  const hydrateProviders = useCloudStore(state => state.hydrate);
  const favoriteItems = useFavoritesStore(state => state.items);
  const setFavoriteItems = useFavoritesStore(state => state.setItems);
  const setFavoritesLoading = useFavoritesStore(state => state.setLoading);
  const handledClipboardJobsRef = useRef(new Set<string>());
  const [storageAccessStatus, setStorageAccessStatus] =
    useState<StorageAccessStatus>('unsupported');
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'locations' | 'favorites' | 'recent'>(
    'locations',
  );

  const selectedIdSet = useMemo(
    () => new Set(explorer.selectedNodeIds),
    [explorer.selectedNodeIds],
  );
  const selectedNodes = useMemo(
    () => explorer.nodes.filter(node => selectedIdSet.has(node.id)),
    [explorer.nodes, selectedIdSet],
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
    } catch {
      setStorageAccessStatus('unsupported');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshStorageAccessStatus();
    }, [refreshStorageAccessStatus]),
  );

  useFocusEffect(
    useCallback(() => {
      const onHardwareBackPress = () => {
        if (isDrawerOpen) {
          setDrawerOpen(false);
          return true;
        }

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
    }, [explorer.goBack, explorer.mode, isDrawerOpen]),
  );

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
          job.sourceItems.some(sourceItem =>
            sourceItem.path.startsWith(explorer.currentPath),
          );

        if (affectsCurrentPath) {
          explorer.requestReload();
        }
      });
    });

    return unsubscribe;
  }, [explorer.currentPath, explorer.requestReload]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const handleHomeEntryPress = useCallback(
    (entryId: ExplorerHomeEntryId) => {
      setDrawerOpen(false);

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
          error instanceof Error ? error.message : 'Bu bölüm açılamadı.';

        setInteractionError(message);
        explorer.openPlaceholderView(
          createUnsupportedCategoryPlaceholder(entryId, message),
        );
      }
    },
    [explorer],
  );

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
      void explorer.openNode(node);
    },
    [closeDrawer, explorer],
  );

  const handleOpenSettings = useCallback(() => {
    closeDrawer();
    navigation.navigate('Settings');
  }, [closeDrawer, navigation]);

  const handleCopySelection = useCallback(() => {
    operations.copySelection();
    explorer.clearSelection();
  }, [explorer, operations]);

  const handleMoveSelection = useCallback(() => {
    operations.cutSelection();
    explorer.clearSelection();
  }, [explorer, operations]);

  const handlePasteClipboard = useCallback(async () => {
    try {
      await operations.pasteIntoCurrentFolder();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Öğeler yapıştırılamadı.';
      Alert.alert('Yapıştırma başarısız', message);
    }
  }, [operations]);

  const handleShareSelection = useCallback(async () => {
    if (selectedNodes.length === 0) {
      return;
    }

    try {
      await Share.share({
        title: 'Öğeleri gönder',
        message: selectedNodes.map(node => node.path).join('\n'),
      });
      explorer.clearSelection();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Öğeler paylaşılamadı.';
      Alert.alert('Gönderim başarısız', message);
    }
  }, [explorer, selectedNodes]);

  const handleOpenSelected = useCallback(() => {
    if (selectedNodes.length === 0) {
      return;
    }

    const primaryNode = selectedNodes[0];

    if (!primaryNode) {
      return;
    }

    explorer.clearSelection();
    void explorer.openNode(primaryNode);
  }, [explorer, selectedNodes]);

  const handleHideSelection = useCallback(async () => {
    if (selectedNodes.length === 0) {
      return;
    }

    try {
      for (const node of selectedNodes) {
        if (node.name.startsWith('.')) {
          continue;
        }

        await localFileSystemBridge.renameEntry(node.path, `.${node.name}`);
      }

      explorer.clearSelection();
      explorer.requestReload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Öğeler gizlenemedi.';
      Alert.alert('İşlem tamamlanamadı', message);
    }
  }, [explorer, selectedNodes]);

  const handleCreateTextFile = useCallback(async () => {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:]/g, '-')
        .replace('T', ' ')
        .slice(0, 16);
      const fileName = `Yeni dosya ${timestamp}.txt`;

      await localFileSystemBridge.createTextFile(explorer.currentPath, fileName, '');
      explorer.clearSelection();
      explorer.requestReload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Yeni dosya oluşturulamadı.';
      Alert.alert('Dosya oluşturulamadı', message);
    }
  }, [explorer]);

  const renderItem = useCallback(
    ({item}: {item: (typeof explorer.nodes)[number]}) => (
      <FileListItem
        node={item}
        onLongPress={explorer.toggleSelection}
        onPress={node => {
          setInteractionError(null);

          if (explorer.selectedNodeIds.length > 0) {
            explorer.toggleSelection(node);
            return;
          }

          void explorer.openNode(node);
        }}
        selected={selectedIdSet.has(item.id)}
      />
    ),
    [explorer, selectedIdSet],
  );

  const directoryHeader = useMemo(
    () => (
      <>
        <ExplorerHeader
          canGoBack={explorer.canGoBack}
          currentPath={explorer.currentPath}
          currentPathLabel={explorer.currentPathLabel}
          onOpenDrawer={openDrawer}
          onGoBack={explorer.goBack}
          selectedCount={explorer.selectedNodeIds.length}
        />
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
      explorer.selectedNodeIds.length,
      openDrawer,
      theme.spacing.md,
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
          supportingText="Farklı bir klasöre geçebilir veya depolama erişim iznini kontrol edebilirsiniz."
          title="Klasör açılamadı"
        />
      );
    }

    const emptyState = explorer.activeEmptyState ?? genericDirectoryEmptyState;

    return (
      <EmptyState
        description={emptyState.description}
        icon={emptyState.icon}
        supportingText="Bu klasöre yeni içerik eklendiğinde burada görünür."
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
      await storagePermissionBridge.requestAccess();
      await refreshStorageAccessStatus();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'İzin ekranı açılamadı.';
      setInteractionError(message);
    }
  }, [refreshStorageAccessStatus]);

  const drawerOverlay = isDrawerOpen ? (
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
          onOpenSettings={handleOpenSettings}
          onSelectTab={setDrawerTab}
          recentItems={explorer.recentOpenedNodes}
        />
      </View>
    </View>
  ) : null;

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
        {drawerOverlay}
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
          <ExplorerHeader
            canGoBack={explorer.canGoBack}
            currentPath={explorer.currentPath}
            currentPathLabel={explorer.placeholderView.title}
            onOpenDrawer={openDrawer}
            onGoBack={explorer.goBack}
            selectedCount={0}
          />
          {interactionError ? <InlineError message={interactionError} /> : null}
          <ExplorerPlaceholderView
            onBack={explorer.goBack}
            placeholder={explorer.placeholderView}
            providers={providers}
          />
        </ScrollView>
        {drawerOverlay}
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
          <ExplorerHeader
            canGoBack={explorer.canGoBack}
            currentPath={explorer.previewNode.path}
            currentPathLabel={explorer.previewNode.name}
            onOpenDrawer={openDrawer}
            onGoBack={explorer.goBack}
            selectedCount={0}
          />
          <FilePreviewView node={explorer.previewNode} onBack={explorer.goBack} />
        </ScrollView>
        {drawerOverlay}
      </ScreenContainer>
    );
  }

  const bottomInset =
    explorer.selectedNodeIds.length > 0 || operations.clipboard
      ? 128
      : theme.spacing.xxl;

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
          initialNumToRender={8}
          keyExtractor={item => item.id}
          ListEmptyComponent={emptyComponent}
          ListHeaderComponent={directoryHeader}
          ItemSeparatorComponent={() => <View style={{height: theme.spacing.sm}} />}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          updateCellsBatchingPeriod={16}
          windowSize={5}
          contentContainerStyle={{
            paddingBottom: bottomInset,
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
            flexGrow: 1,
          }}
        />
        {explorer.selectedNodeIds.length > 0 ? (
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              left: 0,
            }}>
            <ExplorerSelectionActionBar
              selectedCount={explorer.selectedNodeIds.length}
              onCopy={handleCopySelection}
              onCreateFile={() => {
                void handleCreateTextFile();
              }}
              onHide={() => {
                void handleHideSelection();
              }}
              onMove={handleMoveSelection}
              onOpenWith={handleOpenSelected}
              onShare={() => {
                void handleShareSelection();
              }}
            />
          </View>
        ) : operations.clipboard ? (
          <View
            style={{
              position: 'absolute',
              right: 0,
              bottom: 0,
              left: 0,
            }}>
            <ExplorerClipboardActionBar
              itemCount={operations.clipboard.items.length}
              mode={operations.clipboard.mode}
              onClear={operations.clearClipboard}
              onPaste={() => {
                void handlePasteClipboard();
              }}
            />
          </View>
        ) : null}
        {drawerOverlay}
      </View>
    </ScreenContainer>
  );
};

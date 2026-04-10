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
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Check,
  Eye,
  EyeOff,
  FilePlus2,
  Folder,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  RefreshCcw,
  Settings,
} from 'lucide-react-native';

import {appContainer} from '@/app/di/container';
import type {RootStackParamList} from '@/app/navigation/types';
import {useUiStore} from '@/app/store/ui.store';
import {AppText} from '@/components/common/AppText';
import {EmptyState} from '@/components/feedback/EmptyState';
import {InlineError} from '@/components/feedback/InlineError';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {TRASH_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
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
import {useTrashStore} from '@/features/explorer/store/trash.store';
import type {ExplorerHomeEntryId} from '@/features/explorer/types/explorer.types';
import {
  createUnsupportedCategoryPlaceholder,
  resolveExplorerCategoryAction,
} from '@/features/explorer/view-models/explorerCategoryActionResolver';
import {homeShortcuts} from '@/features/explorer/view-models/homeShortcuts';
import {storageCards} from '@/features/explorer/view-models/storageCards';
import {useFavoritesStore} from '@/features/favorites/store/favorites.store';
import {useAppTheme} from '@/hooks/useAppTheme';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';
import {
  storagePermissionBridge,
  type StorageAccessStatus,
} from '@/services/platform/StoragePermissionBridge';
import {formatAbsoluteDate} from '@/utils/formatAbsoluteDate';
import {formatBytes} from '@/utils/formatBytes';
import {getParentPath, getPathSegments} from '@/utils/path';

const genericDirectoryEmptyState = {
  title: 'Bu klasörde henüz içerik yok',
  description:
    'Bu konum şu anda boş görünüyor. Başka bir klasöre geçebilir veya yeni dosya oluşturabilirsiniz.',
  icon: 'folder' as const,
};

const sortModes = [
  {id: 'name-asc', label: 'Ad artan'},
  {id: 'name-desc', label: 'Ad azalan'},
  {id: 'size-asc', label: 'Boyut artan'},
  {id: 'size-desc', label: 'Boyut azalan'},
  {id: 'date-asc', label: 'Tarih artan'},
  {id: 'date-desc', label: 'Tarih azalan'},
  {id: 'type-asc', label: 'Tür artan'},
  {id: 'type-desc', label: 'Tür azalan'},
] as const;

const viewModes = [
  {id: 'details', label: 'Detaylı', icon: LayoutList},
  {id: 'compact', label: 'Küçük detaylı', icon: LayoutList},
  {id: 'large-icons', label: 'Büyük simgeli', icon: LayoutGrid},
  {id: 'small-icons', label: 'Küçük simgeli', icon: LayoutGrid},
] as const;

const segmentLabelMap: Record<string, string> = {
  'Ana bellek': 'Ana bellek',
  Download: 'İndirilenler',
  Documents: 'Belgeler',
  Pictures: 'Görüntüler',
  Music: 'Ses',
  Movies: 'Videolar',
  Recent: 'Yeni Dosyalar',
  DCIM: 'Kamera',
  '.dosya-yoneticisi-trash': 'Çöp Kutusu',
};

const getDisplaySegments = (path: string): string[] =>
  getPathSegments(path).map(segment => segmentLabelMap[segment] ?? segment);

const getNodeSummary = (node: FileSystemNode): string =>
  node.kind === 'directory'
    ? `${node.childCount ?? 0} öğe`
    : formatBytes(node.sizeBytes).toLowerCase();

const sortNodes = (
  nodes: FileSystemNode[],
  sortModeId: (typeof sortModes)[number]['id'],
): FileSystemNode[] => {
  const sorted = [...nodes];
  const getComparableType = (node: FileSystemNode) => {
    if (node.kind === 'directory') {
      return 'klasör';
    }
    return node.extension?.toLocaleLowerCase('tr-TR') ?? '';
  };

  sorted.sort((leftNode, rightNode) => {
    if (leftNode.kind !== rightNode.kind) {
      return leftNode.kind === 'directory' ? -1 : 1;
    }

    switch (sortModeId) {
      case 'name-asc':
        return leftNode.name.localeCompare(rightNode.name, 'tr');
      case 'name-desc':
        return rightNode.name.localeCompare(leftNode.name, 'tr');
      case 'size-asc':
        return (leftNode.sizeBytes ?? 0) - (rightNode.sizeBytes ?? 0);
      case 'size-desc':
        return (rightNode.sizeBytes ?? 0) - (leftNode.sizeBytes ?? 0);
      case 'date-asc':
        return new Date(leftNode.modifiedAt).getTime() - new Date(rightNode.modifiedAt).getTime();
      case 'type-asc':
        return getComparableType(leftNode).localeCompare(getComparableType(rightNode), 'tr');
      case 'type-desc':
        return getComparableType(rightNode).localeCompare(getComparableType(leftNode), 'tr');
      case 'date-desc':
      default:
        return new Date(rightNode.modifiedAt).getTime() - new Date(leftNode.modifiedAt).getTime();
    }
  });

  return sorted;
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
  const addFavoriteItem = useFavoritesStore(state => state.restoreFavorite);
  const removeFavoriteItem = useFavoritesStore(state => state.removeFavorite);
  const trashEntries = useTrashStore(state => state.entries);
  const upsertTrashEntry = useTrashStore(state => state.upsertEntry);
  const removeTrashEntry = useTrashStore(state => state.removeEntry);
  const removeExpiredTrashEntries = useTrashStore(state => state.removeExpiredEntries);
  const findTrashEntry = useTrashStore(state => state.findEntry);
  const showHiddenFiles = useUiStore(state => state.showHiddenFiles);
  const setShowHiddenFiles = useUiStore(state => state.setShowHiddenFiles);
  const handledClipboardJobsRef = useRef(new Set<string>());
  const [storageAccessStatus, setStorageAccessStatus] = useState<StorageAccessStatus>('unsupported');
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'locations' | 'favorites' | 'recent'>('locations');
  const [sortModeId, setSortModeId] = useState<(typeof sortModes)[number]['id']>('date-desc');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deletePermanently, setDeletePermanently] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isSortMenuOpen, setSortMenuOpen] = useState(false);
  const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isCreateMenuOpen, setCreateMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'compact' | 'large-icons' | 'small-icons'>('details');
  const selectedIdSet = useMemo(() => new Set(explorer.selectedNodeIds), [explorer.selectedNodeIds]);
  const isTrashView = explorer.currentPath === TRASH_DIRECTORY;
  const isGridView = viewMode === 'large-icons' || viewMode === 'small-icons';
  const gridColumns = viewMode === 'small-icons' ? 4 : 3;
  const topMenuOffset = isSearchOpen ? 94 : 56;

  const sortedNodes = useMemo(() => sortNodes(explorer.nodes, sortModeId), [explorer.nodes, sortModeId]);
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return sortedNodes;
    }

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return sortedNodes.filter(node => node.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery));
  }, [searchQuery, sortedNodes]);

  const homeStorageItems = useMemo(() => {
    if (!searchQuery.trim() || explorer.mode !== 'home') {
      return storageCards;
    }

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return storageCards.filter(item => item.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery));
  }, [explorer.mode, searchQuery]);

  const homeShortcutItems = useMemo(() => {
    if (!searchQuery.trim() || explorer.mode !== 'home') {
      return homeShortcuts;
    }

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return homeShortcuts.filter(item => item.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery));
  }, [explorer.mode, searchQuery]);

  const selectedNodes = useMemo(
    () => explorer.nodes.filter(node => selectedIdSet.has(node.id)),
    [explorer.nodes, selectedIdSet],
  );
  const primarySelectedNode = selectedNodes[0] ?? null;

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

  useEffect(() => {
    const cleanupExpiredTrash = async () => {
      const expiredEntries = removeExpiredTrashEntries(new Date().toISOString());

      for (const entry of expiredEntries) {
        try {
          await localFileSystemBridge.deleteEntry(entry.trashPath);
        } catch {
          continue;
        }
      }
    };

    void cleanupExpiredTrash();
  }, [removeExpiredTrashEntries]);

  useEffect(() => {
    setSortMenuOpen(false);
    setMoreMenuOpen(false);
    setCreateMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
  }, [explorer.currentPath, explorer.mode]);

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

        if (isSortMenuOpen || isMoreMenuOpen || isSearchOpen) {
          setSortMenuOpen(false);
          setMoreMenuOpen(false);
          setCreateMenuOpen(false);
          setSearchOpen(false);
          return true;
        }

        if (explorer.mode !== 'home') {
          explorer.goBack();
          return true;
        }

        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
      return () => subscription.remove();
    }, [explorer.goBack, explorer.mode, isDrawerOpen, isMoreMenuOpen, isSearchOpen, isSortMenuOpen]),
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
          job.sourceItems.some(sourceItem => sourceItem.path.startsWith(explorer.currentPath));

        if (affectsCurrentPath) {
          explorer.requestReload();
        }
      });
    });

    return unsubscribe;
  }, [explorer.currentPath, explorer.requestReload]);

  const openDrawer = useCallback(() => {
    setSortMenuOpen(false);
    setMoreMenuOpen(false);
    setCreateMenuOpen(false);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleHomeEntryPress = useCallback(
    (entryId: ExplorerHomeEntryId) => {
      setDrawerOpen(false);
      setInteractionError(null);

      try {
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
        const message = error instanceof Error ? error.message : 'Bu bölüm açılamadı.';
        setInteractionError(message);
        explorer.openPlaceholderView(createUnsupportedCategoryPlaceholder(entryId, message));
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
    (node: FileSystemNode) => {
      closeDrawer();
      void explorer.openNode(node);
    },
    [closeDrawer, explorer],
  );

  const handleRemoveFavoriteFromDrawer = useCallback(
    (node: FileSystemNode) => removeFavoriteItem(node.id),
    [removeFavoriteItem],
  );

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
      const message = error instanceof Error ? error.message : 'Öğeler yapıştırılamadı.';
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
      const message = error instanceof Error ? error.message : 'Öğeler paylaşılamadı.';
      Alert.alert('Gönderim başarısız', message);
    }
  }, [explorer, selectedNodes]);

  const handleOpenSelected = useCallback(() => {
    if (!primarySelectedNode) {
      return;
    }

    explorer.clearSelection();
    void explorer.openNode(primarySelectedNode);
  }, [explorer, primarySelectedNode]);

  const handleHideSelection = useCallback(async () => {
    if (selectedNodes.length === 0) {
      return;
    }

    try {
      for (const node of selectedNodes) {
        if (!node.name.startsWith('.')) {
          await localFileSystemBridge.renameEntry(node.path, `.${node.name}`);
        }
      }

      explorer.clearSelection();
      explorer.requestReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Öğeler gizlenemedi.';
      Alert.alert('İşlem tamamlanamadı', message);
    }
  }, [explorer, selectedNodes]);

  const handleCreateTextFile = useCallback(async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:]/g, '-').replace('T', ' ').slice(0, 16);
      await localFileSystemBridge.createTextFile(explorer.currentPath, `Yeni dosya ${timestamp}.txt`, '');
      explorer.clearSelection();
      explorer.requestReload();
      setMoreMenuOpen(false);
      setCreateMenuOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yeni dosya oluşturulamadı.';
      Alert.alert('Dosya oluşturulamadı', message);
    }
  }, [explorer]);

  const handleCreateDirectory = useCallback(async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:]/g, '-').replace('T', ' ').slice(0, 16);
      await localFileSystemBridge.createDirectory(`${explorer.currentPath}/Yeni klasör ${timestamp}`);
      explorer.requestReload();
      setMoreMenuOpen(false);
      setCreateMenuOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Yeni klasör oluşturulamadı.';
      Alert.alert('Klasör oluşturulamadı', message);
    }
  }, [explorer]);

  const handleAddSelectionToFavorites = useCallback(() => {
    if (selectedNodes.length === 0) {
      return;
    }

    selectedNodes.forEach(node => addFavoriteItem(node));
    explorer.clearSelection();
  }, [addFavoriteItem, explorer, selectedNodes]);

  const handleDeleteSelection = useCallback(() => {
    if (selectedNodes.length > 0) {
      setDeleteConfirmVisible(true);
    }
  }, [selectedNodes.length]);

  const handleRestoreSelection = useCallback(async () => {
    if (!isTrashView || selectedNodes.length === 0) {
      return;
    }

    try {
      for (const node of selectedNodes) {
        const trashEntry = findTrashEntry(node.path);
        if (!trashEntry) {
          continue;
        }

        const parentDirectory = getParentPath(trashEntry.originalPath);
        try {
          await localFileSystemBridge.createDirectory(parentDirectory);
        } catch {
          // Klasör zaten mevcut olabilir.
        }

        await localFileSystemBridge.moveEntry(node.path, parentDirectory, 'rename');
        removeTrashEntry(node.path);
      }

      explorer.clearSelection();
      explorer.requestReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Öğeler geri yüklenemedi.';
      Alert.alert('Geri yükleme başarısız', message);
    }
  }, [explorer, findTrashEntry, isTrashView, removeTrashEntry, selectedNodes]);

  const confirmDeleteSelection = useCallback(async () => {
    if (selectedNodes.length === 0) {
      setDeleteConfirmVisible(false);
      return;
    }

    try {
      if (deletePermanently) {
        for (const node of selectedNodes) {
          await localFileSystemBridge.deleteEntry(node.path);
          removeTrashEntry(node.path);
          removeFavoriteItem(node.id);
        }
      } else {
        await localFileSystemBridge.createDirectory(TRASH_DIRECTORY);
        for (const node of selectedNodes) {
          const nextPath = await localFileSystemBridge.moveEntry(node.path, TRASH_DIRECTORY, 'rename');
          upsertTrashEntry({
            trashPath: nextPath,
            originalPath: node.path,
            deletedAt: new Date().toISOString(),
          });
          removeFavoriteItem(node.id);
        }
      }

      explorer.clearSelection();
      explorer.requestReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Öğeler silinemedi.';
      Alert.alert('Silme başarısız', message);
    } finally {
      setDeleteConfirmVisible(false);
      setDeletePermanently(false);
    }
  }, [deletePermanently, explorer, removeFavoriteItem, removeTrashEntry, selectedNodes, upsertTrashEntry]);

  const handlePrimarySelectionAction = useCallback(() => {
    if (isTrashView) {
      void handleRestoreSelection();
      return;
    }

    void handleHideSelection();
  }, [handleHideSelection, handleRestoreSelection, isTrashView]);

  const handleRefreshCurrent = useCallback(() => {
    setInteractionError(null);
    explorer.requestReload();
    setMoreMenuOpen(false);
  }, [explorer]);

  const handleToggleHiddenFiles = useCallback(() => {
    setShowHiddenFiles(!showHiddenFiles);
    setMoreMenuOpen(false);
  }, [setShowHiddenFiles, showHiddenFiles]);

  const handleOpenSettings = useCallback(() => {
    setMoreMenuOpen(false);
    navigation.navigate('Settings');
  }, [navigation]);

  const handleOpenAnalysis = useCallback(() => {
    setMoreMenuOpen(false);
    navigation.navigate('StorageAnalysis');
  }, [navigation]);

  const requestStorageAccess = useCallback(async () => {
    try {
      setInteractionError(null);
      await storagePermissionBridge.requestAccess();
      await refreshStorageAccessStatus();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'İzin ekranı açılamadı.';
      setInteractionError(message);
    }
  }, [refreshStorageAccessStatus]);

  const toggleSearch = useCallback(() => {
    setSortMenuOpen(false);
    setMoreMenuOpen(false);
    setCreateMenuOpen(false);
    setSearchOpen(currentValue => {
      if (currentValue) {
        setSearchQuery('');
      }
      return !currentValue;
    });
  }, []);

  const toggleSortMenu = useCallback(() => {
    setSearchOpen(false);
    setMoreMenuOpen(false);
    setCreateMenuOpen(false);
    setSortMenuOpen(currentValue => !currentValue);
  }, []);

  const toggleMoreMenu = useCallback(() => {
    setSearchOpen(false);
    setSortMenuOpen(false);
    setMoreMenuOpen(currentValue => !currentValue);
    setCreateMenuOpen(false);
  }, []);

  const currentSegments = useMemo(() => {
    if (explorer.mode === 'home') {
      return [];
    }
    if (explorer.mode === 'browser') {
      return getDisplaySegments(explorer.currentPath);
    }
    if (explorer.mode === 'preview' && explorer.previewNode) {
      return getDisplaySegments(explorer.previewNode.path);
    }
    if (explorer.mode === 'placeholder' && explorer.placeholderView) {
      return [explorer.placeholderView.title];
    }
    return [];
  }, [explorer.currentPath, explorer.mode, explorer.placeholderView, explorer.previewNode]);

  const headerTitle = useMemo(() => {
    if (explorer.mode === 'home') {
      return 'Dosya Yöneticisi';
    }
    return currentSegments.at(-1) ?? 'Dosya Yöneticisi';
  }, [currentSegments, explorer.mode]);

  const searchPlaceholder = explorer.mode === 'home' ? 'Dosya ara' : 'Bu klasörde ara';

  const renderListItem = useCallback(
    ({item}: {item: FileSystemNode}) => {
      const trashEntry = isTrashView ? trashEntries.find(entry => entry.trashPath === item.path) : undefined;
      const daysLeft = trashEntry
        ? Math.max(
            0,
            30 - Math.floor((Date.now() - new Date(trashEntry.deletedAt).getTime()) / (1000 * 60 * 60 * 24)),
          )
        : null;

      return (
        <FileListItem
          density={viewMode === 'compact' ? 'compact' : 'details'}
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
          rightMetaOverride={formatAbsoluteDate(item.modifiedAt)}
          selected={selectedIdSet.has(item.id)}
          {...(trashEntry && daysLeft != null
            ? {leftMetaOverride: `${daysLeft} gün kaldı`}
            : {})}
        />
      );
    },
    [explorer, isTrashView, selectedIdSet, trashEntries, viewMode],
  );

  const renderGridItem = useCallback(
    ({item}: {item: FileSystemNode}) => {
      const isDirectory = item.kind === 'directory';

      return (
        <Pressable
          onLongPress={() => explorer.toggleSelection(item)}
          onPress={() => {
            setInteractionError(null);
            if (explorer.selectedNodeIds.length > 0) {
              explorer.toggleSelection(item);
              return;
            }
            void explorer.openNode(item);
          }}
          style={({pressed}) => ({
            flex: 1,
            minHeight: viewMode === 'large-icons' ? 118 : 96,
            backgroundColor: selectedIdSet.has(item.id) ? theme.colors.primaryMuted : theme.colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.md,
            opacity: pressed ? 0.86 : 1,
          })}>
          <View
            style={{
              backgroundColor: isDirectory ? theme.colors.surfaceMuted : theme.colors.primaryMuted,
              padding: viewMode === 'large-icons' ? theme.spacing.md : theme.spacing.sm,
            }}>
            {isDirectory ? (
              <Folder color={theme.colors.text} size={viewMode === 'large-icons' ? 26 : 20} />
            ) : (
              <ImageIcon color={theme.colors.primary} size={viewMode === 'large-icons' ? 26 : 20} />
            )}
          </View>
          <AppText
            numberOfLines={2}
            style={{fontSize: theme.typography.caption, marginTop: theme.spacing.sm, textAlign: 'center'}}
            weight="semibold">
            {item.name}
          </AppText>
        </Pressable>
      );
    },
    [explorer, selectedIdSet, theme, viewMode],
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
    if (searchQuery.trim()) {
      return (
        <EmptyState
          description="Arama ölçütünü değiştirmeyi deneyebilirsiniz."
          icon="folder"
          supportingText="Bu klasörde aradığınız adla eşleşen öğe bulunamadı."
          title="Sonuç bulunamadı"
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
  }, [explorer.activeEmptyState, explorer.errorMessage, explorer.isLoading, searchQuery, theme.colors.primary, theme.spacing.xxl]);

  const headerNode = (
    <ExplorerHeader
      isSearchOpen={isSearchOpen}
      onChangeSearchQuery={setSearchQuery}
      onOpenDrawer={openDrawer}
      onToggleMoreMenu={toggleMoreMenu}
      onToggleSearch={toggleSearch}
      onToggleSortMenu={toggleSortMenu}
      searchQuery={searchQuery}
      title={headerTitle}
      {...(searchPlaceholder ? {searchPlaceholder} : {})}
      {...(explorer.mode !== 'home' ? {segments: currentSegments} : {})}
    />
  );

  const topStatusArea = (
    <>
      {interactionError ? <InlineError message={interactionError} /> : null}
      {storageAccessStatus === 'missing' ? <StorageAccessPrompt onGrantAccess={requestStorageAccess} /> : null}
    </>
  );

  const bottomBar =
    explorer.selectedNodeIds.length > 0 ? (
      <ExplorerSelectionActionBar
        isTrashView={isTrashView}
        onAddFavorite={handleAddSelectionToFavorites}
        onCopy={handleCopySelection}
        onCreateFile={() => {
          void handleCreateTextFile();
        }}
        onDelete={handleDeleteSelection}
        onMove={handleMoveSelection}
        onOpenWith={handleOpenSelected}
        onPrimaryAction={handlePrimarySelectionAction}
        onShare={() => {
          void handleShareSelection();
        }}
        selectedCount={explorer.selectedNodeIds.length}
      />
    ) : operations.clipboard ? (
      <ExplorerClipboardActionBar
        itemCount={operations.clipboard.items.length}
        mode={operations.clipboard.mode}
        onClear={operations.clearClipboard}
        onPaste={() => {
          void handlePasteClipboard();
        }}
      />
    ) : (
      <View
        style={{
          borderTopWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          height: 10,
        }}
      />
    );

  const contentBottomInset =
    explorer.selectedNodeIds.length > 0 || operations.clipboard
      ? 112
      : theme.spacing.xl;

  return (
    <ScreenContainer style={{paddingHorizontal: 0, paddingTop: 0}}>
      <View style={{flex: 1, backgroundColor: theme.colors.background}}>
        {headerNode}
        {isSortMenuOpen ? (
          <View
            style={{
              position: 'absolute',
              top: topMenuOffset,
              right: theme.spacing.md,
              zIndex: 20,
              width: 260,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              padding: theme.spacing.md,
            }}>
            <AppText weight="bold">Görünüm çeşidi</AppText>
            <View style={{marginTop: theme.spacing.sm, gap: theme.spacing.xs}}>
              {viewModes.map(modeOption => {
                const Icon = modeOption.icon;
                const isActive = viewMode === modeOption.id;
                return (
                  <Pressable
                    key={modeOption.id}
                    onPress={() => setViewMode(modeOption.id)}
                    style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                      <Icon color={theme.colors.primary} size={16} />
                      <AppText weight={isActive ? 'bold' : 'semibold'}>{modeOption.label}</AppText>
                    </View>
                    {isActive ? <Check color={theme.colors.primary} size={16} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={{height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm}} />
            <AppText weight="bold">Sırala</AppText>
            <View style={{marginTop: theme.spacing.sm, gap: theme.spacing.xs}}>
              {sortModes.map(modeOption => {
                const SortIcon = modeOption.id.includes('asc') ? ArrowUpAZ : ArrowDownAZ;
                const isActive = sortModeId === modeOption.id;
                return (
                  <Pressable
                    key={modeOption.id}
                    onPress={() => setSortModeId(modeOption.id)}
                    style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                      <SortIcon color={theme.colors.primary} size={16} />
                      <AppText weight={isActive ? 'bold' : 'semibold'}>{modeOption.label}</AppText>
                    </View>
                    {isActive ? <Check color={theme.colors.primary} size={16} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {isMoreMenuOpen ? (
          <View
            style={{
              position: 'absolute',
              top: topMenuOffset,
              right: theme.spacing.md,
              zIndex: 20,
              width: 240,
              borderWidth: 1,
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.surface,
              padding: theme.spacing.md,
            }}>
            <Pressable
              onPress={() => setCreateMenuOpen(currentValue => !currentValue)}
              style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                <FilePlus2 color={theme.colors.primary} size={16} />
                <AppText weight="semibold">Yeni</AppText>
              </View>
              <AppText tone="muted">{isCreateMenuOpen ? '−' : '+'}</AppText>
            </Pressable>
            {isCreateMenuOpen ? (
              <View style={{marginLeft: theme.spacing.md, marginBottom: theme.spacing.sm, gap: theme.spacing.xs}}>
                <Pressable onPress={() => { void handleCreateTextFile(); }} style={{paddingVertical: theme.spacing.sm}}>
                  <AppText>Dosya oluştur</AppText>
                </Pressable>
                <Pressable onPress={() => { void handleCreateDirectory(); }} style={{paddingVertical: theme.spacing.sm}}>
                  <AppText>Klasör oluştur</AppText>
                </Pressable>
              </View>
            ) : null}
            <Pressable onPress={handleOpenAnalysis} style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm}}>
              <ImageIcon color={theme.colors.primary} size={16} />
              <AppText weight="semibold">Analiz et</AppText>
            </Pressable>
            <Pressable onPress={handleRefreshCurrent} style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm}}>
              <RefreshCcw color={theme.colors.primary} size={16} />
              <AppText weight="semibold">Yenile</AppText>
            </Pressable>
            <Pressable onPress={handleToggleHiddenFiles} style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm}}>
              {showHiddenFiles ? <EyeOff color={theme.colors.primary} size={16} /> : <Eye color={theme.colors.primary} size={16} />}
              <AppText weight="semibold">{showHiddenFiles ? 'Gizli dosyaları gizle' : 'Gizli dosyaları göster'}</AppText>
            </Pressable>
            <Pressable onPress={handleOpenSettings} style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm}}>
              <Settings color={theme.colors.primary} size={16} />
              <AppText weight="semibold">Ayarlar</AppText>
            </Pressable>
          </View>
        ) : null}

        {topStatusArea}

        {explorer.mode === 'home' ? (
          <ScrollView
            contentContainerStyle={{paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: contentBottomInset}}
            showsVerticalScrollIndicator={false}>
            <ExplorerDashboard
              onSelectEntry={handleHomeEntryPress}
              shortcutItems={homeShortcutItems}
              storageItems={homeStorageItems}
            />
          </ScrollView>
        ) : explorer.mode === 'placeholder' && explorer.placeholderView ? (
          <ScrollView
            contentContainerStyle={{paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: contentBottomInset}}
            showsVerticalScrollIndicator={false}>
            <ExplorerPlaceholderView onBack={explorer.goBack} placeholder={explorer.placeholderView} providers={providers} />
          </ScrollView>
        ) : explorer.mode === 'preview' && explorer.previewNode ? (
          <ScrollView
            contentContainerStyle={{paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: contentBottomInset}}
            showsVerticalScrollIndicator={false}>
            <FilePreviewView node={explorer.previewNode} onBack={explorer.goBack} />
          </ScrollView>
        ) : (
          <FlatList
            key={`${explorer.currentPath}-${viewMode}`}
            columnWrapperStyle={isGridView ? {gap: theme.spacing.sm, marginBottom: theme.spacing.sm} : undefined}
            contentContainerStyle={{paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: contentBottomInset, flexGrow: 1}}
            data={filteredNodes}
            extraData={explorer.selectedNodeIds}
            initialNumToRender={10}
            ItemSeparatorComponent={isGridView ? undefined : () => <View style={{height: theme.spacing.sm}} />}
            keyExtractor={item => item.id}
            ListEmptyComponent={emptyComponent}
            maxToRenderPerBatch={10}
            numColumns={isGridView ? gridColumns : 1}
            removeClippedSubviews={!isGridView}
            renderItem={isGridView ? renderGridItem : renderListItem}
            showsVerticalScrollIndicator={false}
            updateCellsBatchingPeriod={16}
            windowSize={5}
          />
        )}

        <View style={{position: 'absolute', right: 0, bottom: 0, left: 0}}>
          {bottomBar}
        </View>

        {deleteConfirmVisible ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 40,
              backgroundColor: 'rgba(0, 0, 0, 0.34)',
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.lg,
            }}>
            <View style={{backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.lg, gap: theme.spacing.md}}>
              <AppText weight="bold">Silme işlemini onaylayın</AppText>
              <View>
                <AppText weight="semibold">{primarySelectedNode ? primarySelectedNode.name : `${selectedNodes.length} öğe seçildi`}</AppText>
                <AppText tone="muted" style={{fontSize: theme.typography.caption, marginTop: theme.spacing.xs}}>
                  {primarySelectedNode
                    ? `${getNodeSummary(primarySelectedNode)}  •  ${formatAbsoluteDate(primarySelectedNode.modifiedAt)}`
                    : `${selectedNodes.length} öğe silinecek`}
                </AppText>
              </View>
              <Pressable onPress={() => setDeletePermanently(currentValue => !currentValue)} style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                <View style={{height: 22, width: 22, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: deletePermanently ? theme.colors.primary : theme.colors.surface, alignItems: 'center', justifyContent: 'center'}}>
                  {deletePermanently ? <AppText style={{color: '#FFFFFF', fontSize: theme.typography.caption}} weight="bold">✓</AppText> : null}
                </View>
                <AppText>Kalıcı olarak sil</AppText>
              </Pressable>
              <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm}}>
                <Pressable onPress={() => { setDeleteConfirmVisible(false); setDeletePermanently(false); }} style={{borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm}}>
                  <AppText weight="semibold">Vazgeç</AppText>
                </Pressable>
                <Pressable onPress={() => { void confirmDeleteSelection(); }} style={{backgroundColor: theme.colors.danger, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm}}>
                  <AppText style={{color: '#FFFFFF'}} weight="semibold">Sil</AppText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {isDrawerOpen ? (
          <View pointerEvents="box-none" style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 30}}>
            <Pressable onPress={closeDrawer} style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0, 0, 0, 0.24)'}} />
            <View style={{position: 'absolute', top: 0, bottom: 0, left: 0}}>
              <ExplorerSideDrawer
                activeTab={drawerTab}
                favorites={favoriteItems}
                onClose={closeDrawer}
                onOpenLocation={handleDrawerLocationPress}
                onOpenNode={handleDrawerNodePress}
                onRemoveFavorite={handleRemoveFavoriteFromDrawer}
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

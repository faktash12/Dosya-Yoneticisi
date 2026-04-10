import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Check,
  Eye,
  EyeOff,
  FilePlus2,
  FileText,
  Folder,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  LayoutList,
  RefreshCcw,
  Settings,
  Trash2,
  Video as VideoIcon,
} from 'lucide-react-native';

import {appContainer} from '@/app/di/container';
import type {RootStackParamList} from '@/app/navigation/types';
import {useUiStore} from '@/app/store/ui.store';
import {AppText} from '@/components/common/AppText';
import {EmptyState} from '@/components/feedback/EmptyState';
import {InlineError} from '@/components/feedback/InlineError';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {ROOT_DIRECTORY, TRASH_DIRECTORY} from '@/constants/app';
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
import {useExplorerStore} from '@/features/explorer/store/explorer.store';
import {useTrashStore} from '@/features/explorer/store/trash.store';
import type {
  ExplorerExtendedHomeEntryId,
  ExplorerStorageCardItem,
} from '@/features/explorer/types/explorer.types';
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

interface BreadcrumbItem {
  label: string;
  path: string;
}

interface CreateModalState {
  type: 'folder' | 'text' | 'rename';
  title: string;
  confirmLabel: string;
  value: string;
}

interface InstalledAppItem {
  packageName: string;
  label: string;
  sizeBytes: number;
  sourceDir: string;
  iconBase64?: string | null;
  isSystemApp: boolean;
}

const genericDirectoryEmptyState = {
  title: 'Bu klasörde henüz içerik yok',
  description:
    'Bu konum şu anda boş görünüyor. Başka bir klasöre geçebilir veya yeni dosya oluşturabilirsiniz.',
  icon: 'folder' as const,
};

const sortModes = [
  {id: 'name-asc', label: 'Ad Artan', kind: 'name'},
  {id: 'name-desc', label: 'Ad Azalan', kind: 'name'},
  {id: 'size-asc', label: 'Boyut Artan', kind: 'size'},
  {id: 'size-desc', label: 'Boyut Azalan', kind: 'size'},
  {id: 'date-asc', label: 'Tarih Artan', kind: 'date'},
  {id: 'date-desc', label: 'Tarih Azalan', kind: 'date'},
  {id: 'type-asc', label: 'Tür Artan', kind: 'type'},
  {id: 'type-desc', label: 'Tür Azalan', kind: 'type'},
] as const;

const viewModes = [
  {id: 'details', label: 'Simge Detaylı'},
  {id: 'compact', label: 'Simge Küçük Detaylı'},
  {id: 'large-icons', label: 'Simge Büyük Simgeli'},
  {id: 'small-icons', label: 'Simge Küçük Simgeli'},
] as const;

type DocumentSectionId = 'pdf' | 'word' | 'excel' | 'other';

const documentSections: Array<{
  id: DocumentSectionId;
  title: string;
  extensions: string[];
}> = [
  {id: 'pdf', title: 'PDF’ler', extensions: ['pdf']},
  {id: 'word', title: 'Word', extensions: ['doc', 'docx', 'odt', 'odf', 'rtf']},
  {id: 'excel', title: 'Excel', extensions: ['xls', 'xlsx', 'ods']},
  {
    id: 'other',
    title: 'Diğer',
    extensions: ['txt', 'log', 'md', 'csv', 'ppt', 'pptx'],
  },
];

const archiveExtensions = new Set(['zip', 'rar', '7z']);

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

const getDisplayLabelForSegment = (segment: string): string =>
  segmentLabelMap[segment] ?? segment;

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((item, index) => item === right[index]);

const isImageNode = (node: FileSystemNode): boolean => {
  const extension = node.extension?.toLowerCase();
  return (
    node.kind === 'file' &&
    (['img', 'jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension ?? '') ||
      node.mimeType?.startsWith('image/') === true)
  );
};

const isVideoNode = (node: FileSystemNode): boolean => {
  const extension = node.extension?.toLowerCase();
  return (
    node.kind === 'file' &&
    (['mp4', 'mkv', 'webm', 'mov', 'avi', '3gp'].includes(extension ?? '') ||
      node.mimeType?.startsWith('video/') === true)
  );
};

const isArchiveNode = (node: FileSystemNode): boolean =>
  node.kind === 'file' && archiveExtensions.has(node.extension?.toLowerCase() ?? '');

const getDocumentSectionId = (node: FileSystemNode): DocumentSectionId | null => {
  if (node.kind !== 'file') {
    return null;
  }

  const extension = node.extension?.toLowerCase() ?? '';
  const section = documentSections.find(item => item.extensions.includes(extension));
  return section?.id ?? null;
};

const getTrashDaysLeft = (deletedAt: string): number =>
  Math.max(
    0,
    30 -
      Math.floor(
        (Date.now() - new Date(deletedAt).getTime()) / (1000 * 60 * 60 * 24),
      ),
  );

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

const ViewModeGlyph = ({
  modeId,
  color,
}: {
  modeId: (typeof viewModes)[number]['id'];
  color: string;
}): React.JSX.Element => {
  if (modeId === 'large-icons') {
    return <View style={{height: 16, width: 16, backgroundColor: color}} />;
  }

  if (modeId === 'small-icons') {
    return (
      <View style={{flexDirection: 'row', flexWrap: 'wrap', width: 16, height: 16, gap: 2}}>
        {[0, 1, 2, 3].map(index => (
          <View
            key={index}
            style={{height: 7, width: 7, backgroundColor: color}}
          />
        ))}
      </View>
    );
  }

  if (modeId === 'compact') {
    return (
      <View style={{gap: 2}}>
        {[0, 1].map(index => (
          <View
            key={index}
            style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
            <View style={{height: 4, width: 4, backgroundColor: color}} />
            <View style={{height: 2, width: 10, backgroundColor: color}} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={{gap: 2}}>
      {[0, 1].map(index => (
        <View
          key={index}
          style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
          <View style={{height: 5, width: 5, backgroundColor: color}} />
          <View style={{height: 2, width: 12, backgroundColor: color}} />
        </View>
      ))}
    </View>
  );
};

const SortModeGlyph = ({
  mode,
  color,
}: {
  mode: (typeof sortModes)[number];
  color: string;
}): React.JSX.Element => {
  const isAscending = mode.id.endsWith('asc');

  if (mode.kind === 'name') {
    return isAscending ? (
      <LayoutList color={color} size={16} />
    ) : (
      <LayoutGrid color={color} size={16} />
    );
  }

  if (mode.kind === 'size') {
    return <HardDrive color={color} size={16} />;
  }

  if (mode.kind === 'date') {
    return <RefreshCcw color={color} size={16} />;
  }

  return <FileText color={color} size={16} />;
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
  const removeRecentNode = useExplorerStore(state => state.removeRecentNode);
  const clearRecentNodes = useExplorerStore(state => state.clearRecentNodes);
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FileSystemNode[]>([]);
  const [isSearchLoading, setSearchLoading] = useState(false);
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [isSortMenuOpen, setSortMenuOpen] = useState(false);
  const [isMoreMenuOpen, setMoreMenuOpen] = useState(false);
  const [isCreateMenuOpen, setCreateMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'details' | 'compact' | 'large-icons' | 'small-icons'>('compact');
  const [isRefreshing, setRefreshing] = useState(false);
  const [createModalState, setCreateModalState] = useState<CreateModalState | null>(null);
  const [renameTargetNode, setRenameTargetNode] = useState<FileSystemNode | null>(null);
  const [usbRoots, setUsbRoots] = useState<string[]>([]);
  const [sdRoots, setSdRoots] = useState<string[]>([]);
  const [installedApps, setInstalledApps] = useState<InstalledAppItem[]>([]);
  const [isAppsLoading, setAppsLoading] = useState(false);
  const [selectedAppPackage, setSelectedAppPackage] = useState<string | null>(null);
  const [recentContextNode, setRecentContextNode] = useState<FileSystemNode | null>(null);
  const [documentSectionFilter, setDocumentSectionFilter] =
    useState<DocumentSectionId | null>(null);
  const selectedIdSet = useMemo(() => new Set(explorer.selectedNodeIds), [explorer.selectedNodeIds]);
  const isTrashView = explorer.currentPath === TRASH_DIRECTORY;
  const activeCategoryRootPath = useMemo(() => {
    if (!explorer.activeDirectoryCategoryId) {
      return null;
    }

    const action = resolveExplorerCategoryAction(explorer.activeDirectoryCategoryId);
    return action.kind === 'directory' ? action.path : null;
  }, [explorer.activeDirectoryCategoryId]);
  const isMediaFolderGrid =
    explorer.mode === 'browser' &&
    (explorer.activeDirectoryCategoryId === 'images' ||
      explorer.activeDirectoryCategoryId === 'video') &&
    activeCategoryRootPath != null &&
    explorer.currentPath !== activeCategoryRootPath;
  const isGridView = isMediaFolderGrid || viewMode === 'large-icons' || viewMode === 'small-icons';
  const gridColumns = isMediaFolderGrid || viewMode === 'small-icons' ? 4 : 3;
  const topMenuOffset = isSearchOpen ? 94 : 56;
  const isAppsView =
    explorer.mode === 'placeholder' && explorer.placeholderView?.kind === 'apps-info';

  const sortedNodes = useMemo(() => sortNodes(explorer.nodes, sortModeId), [explorer.nodes, sortModeId]);
  const isDocumentsRootView =
    explorer.mode === 'browser' &&
    explorer.activeDirectoryCategoryId === 'documents' &&
    activeCategoryRootPath != null &&
    explorer.currentPath === activeCategoryRootPath;
  const documentSectionGroups = useMemo(() => {
    const groups: Record<DocumentSectionId, FileSystemNode[]> = {
      pdf: [],
      word: [],
      excel: [],
      other: [],
    };

    sortedNodes.forEach(node => {
      const sectionId = getDocumentSectionId(node);
      if (sectionId) {
        groups[sectionId].push(node);
      }
    });

    return groups;
  }, [sortedNodes]);
  const sectionFilteredNodes = useMemo(() => {
    if (!isDocumentsRootView || documentSectionFilter == null) {
      return sortedNodes;
    }

    return documentSectionGroups[documentSectionFilter];
  }, [documentSectionFilter, documentSectionGroups, isDocumentsRootView, sortedNodes]);
  const filteredNodes = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return sectionFilteredNodes;
    }

    if (explorer.mode === 'browser') {
      return searchResults;
    }

    const normalizedQuery = debouncedSearchQuery.trim().toLocaleLowerCase('tr-TR');
    return sectionFilteredNodes.filter(node => node.name.toLocaleLowerCase('tr-TR').includes(normalizedQuery));
  }, [debouncedSearchQuery, explorer.mode, searchResults, sectionFilteredNodes]);

  const homeStorageItems = useMemo(() => {
    const internalStorageCard = storageCards[0];
    const fixedStorageCards = storageCards.slice(1);
    const resolvedStorageCards: ExplorerStorageCardItem[] = [
      ...(internalStorageCard ? [internalStorageCard] : []),
      ...(sdRoots.length > 0
        ? [
            {
              id: 'sd-card' as const,
              title: 'SD kart',
              subtitle: 'Harici depolama',
              usedLabel: 'Bağlı',
              totalLabel: 'hazır',
              usageRatio: 1,
              icon: 'sd-card' as const,
              isActive: true,
            },
          ]
        : []),
      ...(usbRoots.length > 0
        ? [
            {
              id: 'usb' as const,
              title: 'USB',
              subtitle: 'OTG depolama',
              usedLabel: 'Bağlı',
              totalLabel: 'hazır',
              usageRatio: 1,
              icon: 'usb' as const,
              isActive: true,
            },
          ]
        : []),
      ...fixedStorageCards,
    ];

    if (!searchQuery.trim() || explorer.mode !== 'home') {
      return resolvedStorageCards;
    }

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return resolvedStorageCards.filter(item =>
      item.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery),
    );
  }, [explorer.mode, sdRoots.length, searchQuery, usbRoots.length]);

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

  const refreshRemovableStorageRoots = useCallback(async () => {
    try {
      const devices = await localFileSystemBridge.getRemovableStorageDevices();
      const nextUsbRoots = devices
        .filter(device => device.kind === 'usb')
        .map(device => device.path);
      const nextSdRoots = devices
        .filter(device => device.kind === 'sd-card')
        .map(device => device.path);

      setUsbRoots(currentRoots =>
        areStringArraysEqual(currentRoots, nextUsbRoots) ? currentRoots : nextUsbRoots,
      );
      setSdRoots(currentRoots =>
        areStringArraysEqual(currentRoots, nextSdRoots) ? currentRoots : nextSdRoots,
      );
    } catch {
      setUsbRoots(currentRoots => (currentRoots.length === 0 ? currentRoots : []));
      setSdRoots(currentRoots => (currentRoots.length === 0 ? currentRoots : []));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshRemovableStorageRoots();
    }, [refreshRemovableStorageRoots]),
  );

  useEffect(() => {
    let isActive = true;

    if (!isAppsView) {
      setInstalledApps([]);
      setSelectedAppPackage(null);
      return;
    }

    const loadApps = async () => {
      try {
        setAppsLoading(true);
        const applications = await localFileSystemBridge.listInstalledApps(false);

        if (!isActive) {
          return;
        }

        setInstalledApps(applications);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setInteractionError(
          error instanceof Error ? error.message : 'Uygulamalar yüklenemedi.',
        );
      } finally {
        if (isActive) {
          setAppsLoading(false);
        }
      }
    };

    void loadApps();

    return () => {
      isActive = false;
    };
  }, [isAppsView]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    let isActive = true;

    if (!debouncedSearchQuery.trim() || explorer.mode !== 'browser') {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    const loadSearchResults = async () => {
      try {
        setSearchLoading(true);
        const results = await localFileSystemBridge.searchDirectory(
          explorer.currentPath,
          debouncedSearchQuery,
          showHiddenFiles,
        );

        if (!isActive) {
          return;
        }

        setSearchResults(sortNodes(results, sortModeId));
      } catch (error) {
        if (!isActive) {
          return;
        }

        setInteractionError(
          error instanceof Error ? error.message : 'Arama tamamlanamadı.',
        );
      } finally {
        if (isActive) {
          setSearchLoading(false);
        }
      }
    };

    void loadSearchResults();

    return () => {
      isActive = false;
    };
  }, [
    explorer.currentPath,
    explorer.mode,
    debouncedSearchQuery,
    showHiddenFiles,
    sortModeId,
  ]);

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
    if (!explorer.isLoading) {
      setRefreshing(false);
    }
  }, [explorer.isLoading]);

  useEffect(() => {
    setSortMenuOpen(false);
    setMoreMenuOpen(false);
    setCreateMenuOpen(false);
    setSearchOpen(false);
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setDocumentSectionFilter(null);
  }, [explorer.currentPath, explorer.mode]);

  useEffect(() => {
    if (!explorer.isLoading && !isAppsLoading) {
      setRefreshing(false);
    }
  }, [explorer.isLoading, isAppsLoading]);

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
          setSearchQuery('');
          setDebouncedSearchQuery('');
          return true;
        }

        if (documentSectionFilter != null) {
          setDocumentSectionFilter(null);
          return true;
        }

        if (explorer.mode !== 'home') {
          explorer.goBack();
          return true;
        }

        Alert.alert('Çıkış', 'Uygulamadan çıkmak istediğinize emin misiniz?', [
          {
            text: 'İptal',
            style: 'cancel',
          },
          {
            text: 'Çıkış',
            style: 'destructive',
            onPress: () => {
              void localFileSystemBridge
                .exitApplication()
                .finally(() => BackHandler.exitApp());
            },
          },
        ]);
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
      return () => subscription.remove();
    }, [
      documentSectionFilter,
      explorer.goBack,
      explorer.mode,
      isDrawerOpen,
      isMoreMenuOpen,
      isSearchOpen,
      isSortMenuOpen,
    ]),
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
    (entryId: ExplorerExtendedHomeEntryId) => {
      setDrawerOpen(false);
      setInteractionError(null);

      try {
        if (entryId === 'images' || entryId === 'video') {
          setViewMode('details');
        } else {
          setViewMode('compact');
        }

        if (entryId === 'sd-card') {
          const sdRoot = sdRoots.at(0);
          if (sdRoot) {
            explorer.openBrowserPath(sdRoot, {
              categoryId: null,
              emptyState: {
                title: 'SD kart boş',
                description:
                  'Takılı SD kartta henüz görüntülenecek içerik bulunmuyor.',
                icon: 'sd-card',
              },
            });
            return;
          }

          explorer.openPlaceholderView(
            createUnsupportedCategoryPlaceholder(
              'SD kart',
              'Takılı bir SD kart bulunamadı.',
            ),
          );
          return;
        }

        if (entryId === 'usb') {
          const usbRoot = usbRoots.at(0);
          if (usbRoot) {
            explorer.openBrowserPath(usbRoot, {
              categoryId: null,
              emptyState: {
                title: 'USB boş',
                description:
                  'Bağlı USB depolamada henüz görüntülenecek içerik bulunmuyor.',
                icon: 'storage',
              },
            });
            return;
          }

          explorer.openPlaceholderView(
            createUnsupportedCategoryPlaceholder(
              'USB',
              'Bağlı bir USB/OTG depolama bulunamadı.',
            ),
          );
          return;
        }

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
    [explorer, sdRoots, usbRoots],
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

  const handleClearRecent = useCallback(() => {
    clearRecentNodes();
    setRecentContextNode(null);
  }, [clearRecentNodes]);

  const handleLongPressRecentNode = useCallback((node: FileSystemNode) => {
    setRecentContextNode(node);
  }, []);

  const handleRemoveRecentNode = useCallback(() => {
    if (!recentContextNode) {
      return;
    }

    removeRecentNode(recentContextNode.path);
    setRecentContextNode(null);
  }, [recentContextNode, removeRecentNode]);

  const handleOpenRecentNodeLocation = useCallback(() => {
    if (!recentContextNode) {
      return;
    }

    const targetPath =
      recentContextNode.kind === 'directory'
        ? getParentPath(recentContextNode.path)
        : getParentPath(recentContextNode.path);

    closeDrawer();
    setRecentContextNode(null);
    explorer.openBrowserPath(targetPath, null);
  }, [closeDrawer, explorer, recentContextNode]);

  const handleAddRecentNodeToFavorites = useCallback(() => {
    if (!recentContextNode) {
      return;
    }

    addFavoriteItem(recentContextNode);
    setRecentContextNode(null);
  }, [addFavoriteItem, recentContextNode]);

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
      await localFileSystemBridge.shareFiles(selectedNodes.map(node => node.path));
      explorer.clearSelection();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Öğeler paylaşılamadı.';
      Alert.alert('Gönderim başarısız', message);
    }
  }, [explorer, selectedNodes]);

  const handleGoToSelectedFolder = useCallback(() => {
    if (!primarySelectedNode) {
      return;
    }

    const targetPath =
      primarySelectedNode.kind === 'directory'
        ? primarySelectedNode.path
        : getParentPath(primarySelectedNode.path);
    explorer.clearSelection();
    explorer.openBrowserPath(targetPath, null);
  }, [explorer, primarySelectedNode]);

  const handleExtractSelectedArchive = useCallback(async () => {
    if (!primarySelectedNode || !isArchiveNode(primarySelectedNode)) {
      return;
    }

    try {
      await localFileSystemBridge.extractArchive(
        primarySelectedNode.path,
        getParentPath(primarySelectedNode.path),
      );
      explorer.clearSelection();
      explorer.requestReload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Arşiv dosyası çıkarılamadı.';
      Alert.alert('Çıkarma başarısız', message);
    }
  }, [explorer, primarySelectedNode]);

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

  const openCreateFolderModal = useCallback(() => {
    setCreateModalState({
      type: 'folder',
      title: 'Klasör adını gir',
      confirmLabel: 'Tamam',
      value: '',
    });
    setCreateMenuOpen(false);
    setMoreMenuOpen(false);
  }, []);

  const openCreateTextModal = useCallback(() => {
    setCreateModalState({
      type: 'text',
      title: 'Belge adını gir',
      confirmLabel: 'Tamam',
      value: '',
    });
    setCreateMenuOpen(false);
    setMoreMenuOpen(false);
  }, []);

  const openRenameModal = useCallback(() => {
    if (!primarySelectedNode) {
      return;
    }

    setRenameTargetNode(primarySelectedNode);
    setCreateModalState({
      type: 'rename',
      title: 'Yeni adı gir',
      confirmLabel: 'Kaydet',
      value: primarySelectedNode.name,
    });
  }, [primarySelectedNode]);

  const handleSubmitCreateModal = useCallback(async () => {
    if (!createModalState) {
      return;
    }

    const nextValue = createModalState.value.trim();

    if (!nextValue) {
      Alert.alert('Eksik bilgi', 'Lütfen geçerli bir ad girin.');
      return;
    }

    try {
      if (createModalState.type === 'folder') {
        await localFileSystemBridge.createDirectory(
          `${explorer.currentPath}/${nextValue}`,
        );
      } else if (createModalState.type === 'text') {
        const fileName = nextValue.toLowerCase().endsWith('.txt')
          ? nextValue
          : `${nextValue}.txt`;
        await localFileSystemBridge.createTextFile(
          explorer.currentPath,
          fileName,
          '',
        );
      } else if (renameTargetNode) {
        await localFileSystemBridge.renameEntry(renameTargetNode.path, nextValue);
        explorer.clearSelection();
      }

      setCreateModalState(null);
      setRenameTargetNode(null);
      explorer.requestReload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
      Alert.alert('İşlem tamamlanamadı', message);
    }
  }, [createModalState, explorer, renameTargetNode]);

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

  const handleSelectAllTrashNodes = useCallback(() => {
    if (!isTrashView) {
      return;
    }

    explorer.nodes.forEach(node => {
      if (!selectedIdSet.has(node.id)) {
        explorer.toggleSelection(node);
      }
    });
  }, [explorer, isTrashView, selectedIdSet]);

  const handleUninstallSelectedApp = useCallback(async () => {
    if (!selectedAppPackage) {
      return;
    }

    try {
      await localFileSystemBridge.uninstallPackage(selectedAppPackage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Uygulama kaldırma ekranı açılamadı.';
      Alert.alert('Kaldırma başarısız', message);
    }
  }, [selectedAppPackage]);

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
    setRefreshing(true);
    if (explorer.mode === 'browser') {
      explorer.requestReload();
    }
    if (explorer.mode === 'home') {
      void refreshRemovableStorageRoots().finally(() => setRefreshing(false));
    }
    if (isAppsView) {
      setAppsLoading(true);
      void localFileSystemBridge
        .listInstalledApps(false)
        .then(applications => setInstalledApps(applications))
        .finally(() => {
          setAppsLoading(false);
          setRefreshing(false);
        });
    }
    setMoreMenuOpen(false);
  }, [explorer, isAppsView, refreshRemovableStorageRoots]);

  const handleToggleHiddenFiles = useCallback(() => {
    setShowHiddenFiles(!showHiddenFiles);
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
        setDebouncedSearchQuery('');
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

  const currentBreadcrumbs = useMemo<BreadcrumbItem[]>(() => {
    if (explorer.mode === 'home') {
      return [];
    }

    const buildDirectoryBreadcrumbs = (path: string) => {
      const categoryAction =
        explorer.activeDirectoryCategoryId != null
          ? resolveExplorerCategoryAction(explorer.activeDirectoryCategoryId)
          : null;
      const categoryRootPath =
        categoryAction?.kind === 'directory' && categoryAction.path !== ROOT_DIRECTORY
          ? categoryAction.path
          : null;

      if (categoryRootPath && path.startsWith(categoryRootPath)) {
        const rootRelativeSegments = getPathSegments(categoryRootPath);
        const rootLabel = getDisplayLabelForSegment(
          rootRelativeSegments.at(-1) ?? 'Ana bellek',
        );
        const items: BreadcrumbItem[] = [{label: rootLabel, path: categoryRootPath}];
        const currentSegments = path.split('/').filter(Boolean);
        const rootSegments = categoryRootPath.split('/').filter(Boolean);
        const nestedSegments = currentSegments.slice(rootSegments.length);
        let currentSegmentPath = categoryRootPath;

        nestedSegments.forEach(segment => {
          currentSegmentPath = `${currentSegmentPath}/${segment}`;
          items.push({
            label: getDisplayLabelForSegment(segment),
            path: currentSegmentPath,
          });
        });

        return items;
      }

      const rawSegments = getPathSegments(path);
      return rawSegments.map((segment, index) => ({
        label: getDisplayLabelForSegment(segment),
        path:
          index === 0
            ? ROOT_DIRECTORY
            : `${ROOT_DIRECTORY}/${rawSegments
                .slice(1, index + 1)
                .map(part =>
                  part === 'Ana bellek'
                    ? ''
                    : Object.entries(segmentLabelMap).find(
                        ([, label]) => label === part,
                      )?.[0] ?? part,
                )
                .filter(Boolean)
                .join('/')}`,
      }));
    };

    if (explorer.mode === 'browser') {
      return buildDirectoryBreadcrumbs(explorer.currentPath);
    }

    if (explorer.mode === 'preview' && explorer.previewNode) {
      const items = buildDirectoryBreadcrumbs(explorer.currentPath);
      items.push({
        label: explorer.previewNode.name,
        path: explorer.currentPath,
      });
      return items;
    }

    if (explorer.mode === 'placeholder' && explorer.placeholderView) {
      return [{label: explorer.placeholderView.title, path: ROOT_DIRECTORY}];
    }

    return [];
  }, [
    explorer.activeDirectoryCategoryId,
    explorer.currentPath,
    explorer.mode,
    explorer.placeholderView,
    explorer.previewNode,
  ]);

  const headerTitle = useMemo(() => {
    if (explorer.mode === 'home') {
      return 'Dosya Yöneticisi';
    }
    if (documentSectionFilter != null) {
      return documentSections.find(section => section.id === documentSectionFilter)?.title ?? 'Belgeler';
    }
    return currentBreadcrumbs.at(-1)?.label ?? 'Dosya Yöneticisi';
  }, [currentBreadcrumbs, documentSectionFilter, explorer.mode]);

  const handlePressBreadcrumbSegment = useCallback(
    (index: number) => {
      const target = currentBreadcrumbs[index];
      if (!target) {
        return;
      }

      explorer.openBrowserPath(target.path, {
        categoryId: explorer.activeDirectoryCategoryId,
        emptyState: explorer.activeEmptyState,
      });
    },
    [currentBreadcrumbs, explorer],
  );

  const searchPlaceholder =
    explorer.mode === 'home' ? 'Dosya ara' : 'Bu klasör ve alt klasörlerde ara';

  const handleVisibleNodePress = useCallback(
    (node: FileSystemNode) => {
      setInteractionError(null);
      if (explorer.selectedNodeIds.length > 0) {
        explorer.toggleSelection(node);
        return;
      }

      if (searchQuery.trim() && explorer.mode === 'browser') {
        const targetPath =
          node.kind === 'directory' ? node.path : getParentPath(node.path);

        if (targetPath !== explorer.currentPath) {
          explorer.openBrowserPath(targetPath, {
            categoryId: explorer.activeDirectoryCategoryId,
            emptyState: explorer.activeEmptyState,
          });
          return;
        }
      }

      void explorer.openNode(node);
    },
    [explorer, searchQuery],
  );

  const contentBottomInset =
    explorer.selectedNodeIds.length > 0 ||
    operations.clipboard ||
    (isAppsView && selectedAppPackage)
      ? 112
      : theme.spacing.xl;

  const renderListItem = useCallback(
    ({item}: {item: FileSystemNode}) => {
      const trashEntry = isTrashView ? trashEntries.find(entry => entry.trashPath === item.path) : undefined;
      const daysLeft = trashEntry ? getTrashDaysLeft(trashEntry.deletedAt) : null;
      const trashLeftMeta =
        trashEntry && daysLeft != null
          ? `${item.kind === 'file' ? formatBytes(item.sizeBytes).toLowerCase() : `${item.childCount ?? 0} öğe`}  •  ${daysLeft} gün kaldı`
          : undefined;
      const trashRightMeta = trashEntry
        ? `Silinme tarihi: ${formatAbsoluteDate(trashEntry.deletedAt)}`
        : undefined;

      return (
        <FileListItem
          density={viewMode === 'compact' ? 'compact' : 'details'}
          node={item}
          onLongPress={explorer.toggleSelection}
          onPress={handleVisibleNodePress}
          rightMetaOverride={trashRightMeta ?? formatAbsoluteDate(item.modifiedAt)}
          selected={selectedIdSet.has(item.id)}
          {...(trashLeftMeta
            ? {leftMetaOverride: trashLeftMeta}
            : {})}
        />
      );
    },
    [explorer, handleVisibleNodePress, isTrashView, selectedIdSet, trashEntries, viewMode],
  );

  const renderGridItem = useCallback(
    ({item}: {item: FileSystemNode}) => {
      const isDirectory = item.kind === 'directory';
      const shouldShowPreview =
        (viewMode === 'large-icons' || isMediaFolderGrid) && isImageNode(item);
      const shouldShowVideoPreview =
        (viewMode === 'large-icons' || isMediaFolderGrid) && isVideoNode(item);

      return (
        <Pressable
          onLongPress={() => explorer.toggleSelection(item)}
          onPress={() => handleVisibleNodePress(item)}
          style={({pressed}) => ({
            flex: 1,
            minHeight: isMediaFolderGrid || viewMode === 'large-icons' ? 118 : 96,
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
              padding: isMediaFolderGrid || viewMode === 'large-icons' ? theme.spacing.md : theme.spacing.sm,
            }}>
            {shouldShowPreview ? (
              <Image
                source={{uri: `file://${item.path}`}}
                style={{
                  width: isMediaFolderGrid ? 52 : viewMode === 'large-icons' ? 34 : 24,
                  height: isMediaFolderGrid ? 52 : viewMode === 'large-icons' ? 34 : 24,
                }}
              />
            ) : shouldShowVideoPreview ? (
              <View style={{alignItems: 'center', justifyContent: 'center'}}>
                <VideoIcon
                  color={theme.colors.primary}
                  size={isMediaFolderGrid || viewMode === 'large-icons' ? 28 : 20}
                />
                <View
                  style={{
                    position: 'absolute',
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    backgroundColor: 'rgba(255,255,255,0.82)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <AppText style={{fontSize: 10, color: theme.colors.primary}}>▶</AppText>
                </View>
              </View>
            ) : isDirectory ? (
              <Folder color={theme.colors.text} size={isMediaFolderGrid || viewMode === 'large-icons' ? 26 : 20} />
            ) : (
              <ImageIcon color={theme.colors.primary} size={isMediaFolderGrid || viewMode === 'large-icons' ? 26 : 20} />
            )}
          </View>
          <AppText
            numberOfLines={2}
            style={{fontSize: theme.typography.caption, marginTop: theme.spacing.sm, textAlign: 'center'}}
            weight="regular">
            {item.name}
          </AppText>
        </Pressable>
      );
    },
    [explorer, handleVisibleNodePress, isMediaFolderGrid, selectedIdSet, theme, viewMode],
  );

  const renderDocumentSections = useCallback(
    () => (
      <ScrollView
        refreshControl={
          <RefreshControl
            onRefresh={handleRefreshCurrent}
            refreshing={isRefreshing}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.md,
          paddingBottom: contentBottomInset,
          gap: theme.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}>
        {documentSections.map(section => {
          const sectionNodes = documentSectionGroups[section.id];
          const previewNodes = sectionNodes.slice(0, 5);

          return (
            <View key={section.id} style={{gap: theme.spacing.sm}}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                <AppText style={{fontSize: theme.typography.body}} weight="semibold">
                  {section.title}
                </AppText>
                <Pressable
                  disabled={sectionNodes.length === 0}
                  onPress={() => setDocumentSectionFilter(section.id)}
                  style={{paddingVertical: theme.spacing.xs}}>
                  <AppText
                    tone={sectionNodes.length === 0 ? 'muted' : 'default'}
                    style={{fontSize: theme.typography.caption}}>
                    &gt; Tümü
                  </AppText>
                </Pressable>
              </View>
              {previewNodes.length > 0 ? (
                <View style={{gap: theme.spacing.xs}}>
                  {previewNodes.map(node => (
                    <FileListItem
                      density="compact"
                      key={node.id}
                      node={node}
                      onLongPress={explorer.toggleSelection}
                      onPress={handleVisibleNodePress}
                      selected={selectedIdSet.has(node.id)}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  description="Bu türde belge bulunamadı."
                  icon="documents"
                  title="Liste boş"
                />
              )}
            </View>
          );
        })}
      </ScrollView>
    ),
    [
      contentBottomInset,
      documentSectionGroups,
      explorer.toggleSelection,
      handleRefreshCurrent,
      handleVisibleNodePress,
      isRefreshing,
      selectedIdSet,
      theme,
    ],
  );

  const renderInstalledAppItem = useCallback(
    ({item}: {item: InstalledAppItem}) => (
      <Pressable
        delayLongPress={220}
        onLongPress={() => setSelectedAppPackage(item.packageName)}
        style={({pressed}) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          opacity: pressed ? 0.82 : 1,
          backgroundColor:
            selectedAppPackage === item.packageName
              ? theme.colors.primaryMuted
              : 'transparent',
        })}>
        {item.iconBase64 ? (
          <Image
            source={{uri: `data:image/png;base64,${item.iconBase64}`}}
            style={{width: 42, height: 42}}
          />
        ) : (
          <View
            style={{
              width: 42,
              height: 42,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceMuted,
            }}>
            <AppText style={{fontSize: theme.typography.caption}}>
              {item.label.slice(0, 1)}
            </AppText>
          </View>
        )}
        <View style={{flex: 1}}>
          <AppText
            numberOfLines={1}
            style={{fontSize: theme.typography.body - 1}}>
            {item.label}
          </AppText>
          <AppText
            tone="muted"
            style={{marginTop: theme.spacing.xs, fontSize: theme.typography.caption}}>
            {formatBytes(item.sizeBytes).toLowerCase()}
          </AppText>
        </View>
      </Pressable>
    ),
    [selectedAppPackage, theme],
  );

  const emptyComponent = useMemo(() => {
    if (explorer.isLoading || isSearchLoading) {
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
          supportingText="Bu konum ve alt klasörlerde aradığınız adla eşleşen öğe bulunamadı."
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
  }, [
    explorer.activeEmptyState,
    explorer.errorMessage,
    explorer.isLoading,
    isSearchLoading,
    searchQuery,
    theme.colors.primary,
    theme.spacing.xxl,
  ]);

  const headerNode = (
    <ExplorerHeader
      isSearchOpen={isSearchOpen}
      onClearSearch={() => {
        setSearchQuery('');
        setDebouncedSearchQuery('');
      }}
      onChangeSearchQuery={setSearchQuery}
      onOpenDrawer={openDrawer}
      onPressSegment={handlePressBreadcrumbSegment}
      onToggleMoreMenu={toggleMoreMenu}
      onToggleSearch={toggleSearch}
      onToggleSortMenu={toggleSortMenu}
      searchQuery={searchQuery}
      title={headerTitle}
      {...(searchPlaceholder ? {searchPlaceholder} : {})}
      {...(explorer.mode !== 'home'
        ? {segments: currentBreadcrumbs.map(item => item.label)}
        : {})}
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
        canExtractArchive={selectedNodes.length === 1 && primarySelectedNode != null && isArchiveNode(primarySelectedNode)}
        canGoToFolder={explorer.activeDirectoryCategoryId === 'recent' && selectedNodes.length === 1}
        isTrashView={isTrashView}
        onAddFavorite={handleAddSelectionToFavorites}
        onCopy={handleCopySelection}
        onDelete={handleDeleteSelection}
        onExtractArchive={handleExtractSelectedArchive}
        onGoToFolder={handleGoToSelectedFolder}
        onMove={handleMoveSelection}
        onOpenWith={handleOpenSelected}
        onPrimaryAction={handlePrimarySelectionAction}
        onRename={openRenameModal}
        onShare={() => {
          void handleShareSelection();
        }}
        onSelectAll={handleSelectAllTrashNodes}
        selectedCount={explorer.selectedNodeIds.length}
      />
    ) : isAppsView && selectedAppPackage ? (
      <View
        style={{
          borderTopWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: theme.spacing.md,
        }}>
        <Pressable
          onPress={() => {
            void handleUninstallSelectedApp();
          }}
          style={({pressed}) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.md,
            opacity: pressed ? 0.72 : 1,
          })}>
          <Trash2 color={theme.colors.danger} size={22} />
          <AppText style={{fontSize: theme.typography.body}} weight="semibold">
            Kaldır
          </AppText>
        </Pressable>
      </View>
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

  return (
    <ScreenContainer style={{paddingHorizontal: 0, paddingTop: 0}}>
      <View style={{flex: 1, backgroundColor: theme.colors.background}}>
        {headerNode}
        {isSortMenuOpen || isMoreMenuOpen ? (
          <Pressable
            onPress={() => {
              setSortMenuOpen(false);
              setMoreMenuOpen(false);
              setCreateMenuOpen(false);
            }}
            style={{
              position: 'absolute',
              top: topMenuOffset,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 18,
            }}
          />
        ) : null}
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
                const isActive = viewMode === modeOption.id;
                return (
                  <Pressable
                    key={modeOption.id}
                    onPress={() => setViewMode(modeOption.id)}
                    style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                      <ViewModeGlyph color={theme.colors.primary} modeId={modeOption.id} />
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
                const isActive = sortModeId === modeOption.id;
                return (
                  <Pressable
                    key={modeOption.id}
                    onPress={() => setSortModeId(modeOption.id)}
                    style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm}}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                      <SortModeGlyph color={theme.colors.primary} mode={modeOption} />
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
                <Pressable onPress={openCreateTextModal} style={{paddingVertical: theme.spacing.sm}}>
                  <AppText>Metin Belgesi Oluştur</AppText>
                </Pressable>
                <Pressable onPress={openCreateFolderModal} style={{paddingVertical: theme.spacing.sm}}>
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
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                {showHiddenFiles ? <EyeOff color={theme.colors.primary} size={16} /> : <Eye color={theme.colors.primary} size={16} />}
                <AppText weight="semibold">Gizli Dosya</AppText>
              </View>
              <Switch
                onValueChange={handleToggleHiddenFiles}
                thumbColor="#FFFFFF"
                trackColor={{false: theme.colors.border, true: theme.colors.primary}}
                value={showHiddenFiles}
              />
            </View>
            <Pressable onPress={handleOpenSettings} style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm}}>
              <Settings color={theme.colors.primary} size={16} />
              <AppText weight="semibold">Ayarlar</AppText>
            </Pressable>
          </View>
        ) : null}

        {topStatusArea}

        {explorer.mode === 'home' ? (
          <ScrollView
            refreshControl={
              <RefreshControl
                onRefresh={handleRefreshCurrent}
                refreshing={isRefreshing}
                tintColor={theme.colors.primary}
              />
            }
            contentContainerStyle={{paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: contentBottomInset}}
            showsVerticalScrollIndicator={false}>
            <ExplorerDashboard
              onSelectEntry={handleHomeEntryPress}
              shortcutItems={homeShortcutItems}
              storageItems={homeStorageItems}
            />
          </ScrollView>
        ) : isAppsView ? (
          <FlatList
            key="apps-list"
            refreshControl={
              <RefreshControl
                onRefresh={handleRefreshCurrent}
                refreshing={isRefreshing}
                tintColor={theme.colors.primary}
              />
            }
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.md,
              paddingBottom: contentBottomInset,
              flexGrow: 1,
            }}
            data={installedApps}
            keyExtractor={item => item.packageName}
            ListEmptyComponent={
              isAppsLoading ? (
                <View style={{paddingVertical: theme.spacing.xxl}}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : (
                <EmptyState
                  title="Uygulama bulunamadı"
                  description="Yüklü uygulamalar listesi şu anda boş görünüyor."
                  supportingText="Yenileyip tekrar deneyebilirsiniz."
                  icon="apps"
                />
              )
            }
            renderItem={renderInstalledAppItem}
            showsVerticalScrollIndicator={false}
          />
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
        ) : isDocumentsRootView && documentSectionFilter == null ? (
          renderDocumentSections()
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
            refreshControl={
              <RefreshControl
                onRefresh={handleRefreshCurrent}
                refreshing={isRefreshing}
                tintColor={theme.colors.primary}
              />
            }
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
                <View style={{flex: 1}}>
                  <AppText>Kalıcı olarak sil</AppText>
                  <AppText tone="muted" style={{fontSize: theme.typography.caption, marginTop: theme.spacing.xs}}>
                    Seçilmezse öğe geri dönüşüm kutusuna taşınır ve 30 gün içinde otomatik silinir.
                  </AppText>
                </View>
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

        {createModalState ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 45,
              backgroundColor: 'rgba(0, 0, 0, 0.34)',
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.lg,
            }}>
            <Pressable
              onPress={() => {
                setCreateModalState(null);
                setRenameTargetNode(null);
              }}
              style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}
            />
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: theme.spacing.lg,
                gap: theme.spacing.md,
              }}>
              <AppText weight="bold">{createModalState.title}</AppText>
              <TextInput
                autoFocus
                onChangeText={value =>
                  setCreateModalState(currentState =>
                    currentState ? {...currentState, value} : currentState,
                  )
                }
                placeholder="Ad girin"
                placeholderTextColor={theme.colors.textMuted}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  fontSize: theme.typography.body,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}
                value={createModalState.value}
              />
              <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm}}>
                <Pressable
                  onPress={() => {
                    setCreateModalState(null);
                    setRenameTargetNode(null);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}>
                  <AppText>Vazgeç</AppText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void handleSubmitCreateModal();
                  }}
                  style={{
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}>
                  <AppText style={{color: '#FFFFFF'}}>{createModalState.confirmLabel}</AppText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {recentContextNode ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 46,
              backgroundColor: 'rgba(0, 0, 0, 0.26)',
              justifyContent: 'flex-end',
              padding: theme.spacing.lg,
            }}>
            <Pressable
              onPress={() => setRecentContextNode(null)}
              style={{position: 'absolute', top: 0, right: 0, bottom: 0, left: 0}}
            />
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: theme.spacing.lg,
                gap: theme.spacing.sm,
              }}>
              <AppText>{recentContextNode.name}</AppText>
              <Pressable onPress={handleRemoveRecentNode} style={{paddingVertical: theme.spacing.sm}}>
                <AppText>Listeden Kaldır</AppText>
              </Pressable>
              <Pressable onPress={handleOpenRecentNodeLocation} style={{paddingVertical: theme.spacing.sm}}>
                <AppText>Dosya Konumuna Git</AppText>
              </Pressable>
              <Pressable onPress={handleAddRecentNodeToFavorites} style={{paddingVertical: theme.spacing.sm}}>
                <AppText>Favorilere Ekle</AppText>
              </Pressable>
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
                onClearRecent={handleClearRecent}
                onClose={closeDrawer}
                onLongPressRecent={handleLongPressRecentNode}
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

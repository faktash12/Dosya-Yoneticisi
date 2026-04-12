import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  SectionList,
  ScrollView,
  Switch,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Check,
  Download,
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
import {useTranslation} from '@/i18n';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';
import {
  storagePermissionBridge,
  type StorageAccessStatus,
} from '@/services/platform/StoragePermissionBridge';
import {
  isArchiveNode,
  isApkNode,
  isImageNode,
  isVideoNode,
} from '@/features/explorer/utils/mediaClassification';
import {renderNodeTypeIcon} from '@/features/explorer/utils/fileTypeIcons';
import {shouldIncludeRecentNode} from '@/features/explorer/utils/recentFileRules';
import {groupRecentNodesByDay} from '@/features/explorer/utils/recentSections';
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
  installedAt: string;
  sourceDir: string;
  iconBase64?: string | null;
  isSystemApp: boolean;
  canUninstall?: boolean;
}

type SocialAppId = 'whatsapp' | 'telegram' | 'instagram';
type SocialAccountId = 'default' | 'business';
type SocialGroupId =
  | 'documents'
  | 'images'
  | 'audio'
  | 'video'
  | 'files'
  | 'voice'
  | 'music';

interface SocialGroupDescriptor {
  accountId: SocialAccountId;
  id: SocialGroupId;
  label: string;
}

interface SocialSectionDescriptor {
  id: string;
  title: string;
  groups: SocialGroupDescriptor[];
}

interface SocialExplorerState {
  appId: SocialAppId;
  accountId: SocialAccountId;
  groupId: SocialGroupId | null;
  groupLabel: string | null;
  nodes: FileSystemNode[];
  isLoading: boolean;
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

const socialGroupLabels: Record<SocialGroupId, string> = {
  documents: 'Belgeler',
  images: 'Görüntüler',
  audio: 'Ses',
  video: 'Videolar',
  files: 'Dosyalar',
  voice: 'Sesli Notlar',
  music: 'Müzik',
};

const socialAppLabels: Record<SocialAppId, string> = {
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
  instagram: 'Instagram',
};

const createSocialGroup = (
  accountId: SocialAccountId,
  id: SocialGroupId,
  label: string,
): SocialGroupDescriptor => ({accountId, id, label});

const whatsappGroups = (accountId: SocialAccountId): SocialGroupDescriptor[] => [
  createSocialGroup(accountId, 'images', 'Görüntüler'),
  createSocialGroup(accountId, 'video', 'Videolar'),
  createSocialGroup(accountId, 'documents', 'Dokümanlar'),
  createSocialGroup(accountId, 'voice', 'WhatsApp Sesli Notlar'),
  createSocialGroup(accountId, 'audio', 'Müzik / Ses'),
];

const socialSectionsByApp: Record<SocialAppId, SocialSectionDescriptor[]> = {
  whatsapp: [
    {
      id: 'whatsapp-default',
      title: 'WhatsApp Hesap',
      groups: whatsappGroups('default'),
    },
    {
      id: 'whatsapp-business',
      title: 'WhatsApp Business',
      groups: whatsappGroups('business'),
    },
  ],
  telegram: [
    {
      id: 'telegram',
      title: 'Telegram',
      groups: [
        createSocialGroup('default', 'documents', 'Belgeler'),
        createSocialGroup('default', 'images', 'Görüntüler'),
        createSocialGroup('default', 'video', 'Videolar'),
        createSocialGroup('default', 'voice', 'Ses Kayıtları'),
        createSocialGroup('default', 'music', 'Müzik'),
      ],
    },
  ],
  instagram: [
    {
      id: 'instagram',
      title: 'Instagram',
      groups: [
        createSocialGroup('default', 'images', 'Görüntüler'),
        createSocialGroup('default', 'video', 'Videolar'),
        createSocialGroup('default', 'documents', 'Belgeler'),
        createSocialGroup('default', 'files', 'Diğer Dosyalar'),
      ],
    },
  ],
};

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

const getDocumentSectionId = (node: FileSystemNode): DocumentSectionId | null => {
  if (node.kind !== 'file') {
    return null;
  }

  const extension = node.extension?.toLowerCase() ?? '';
  const section = documentSections.find(item => item.extensions.includes(extension));
  return section?.id ?? null;
};

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
  const {t, locale} = useTranslation();
  const {width: windowWidth} = useWindowDimensions();
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
  const [storageStats, setStorageStats] = useState<{
    totalBytes: number;
    availableBytes: number;
    usedBytes: number;
    downloadsSizeBytes: number;
  } | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledAppItem[]>([]);
  const [isAppsLoading, setAppsLoading] = useState(false);
  const [selectedAppPackage, setSelectedAppPackage] = useState<string | null>(null);
  const [socialExplorer, setSocialExplorer] = useState<SocialExplorerState | null>(null);
  const [recentContextNode, setRecentContextNode] = useState<FileSystemNode | null>(null);
  const [documentSectionFilter, setDocumentSectionFilter] =
    useState<DocumentSectionId | null>(null);
  const getViewModeLabel = useCallback(
    (modeId: (typeof viewModes)[number]['id']) => {
      if (locale !== 'en') {
        return viewModes.find(mode => mode.id === modeId)?.label ?? modeId;
      }

      return (
        {
          details: 'Detailed icons',
          compact: 'Compact icons',
          'large-icons': 'Large icons',
          'small-icons': 'Small icons',
        } satisfies Record<(typeof viewModes)[number]['id'], string>
      )[modeId];
    },
    [locale],
  );
  const getSortModeLabel = useCallback(
    (modeId: (typeof sortModes)[number]['id']) => {
      if (locale !== 'en') {
        return sortModes.find(mode => mode.id === modeId)?.label ?? modeId;
      }

      return (
        {
          'name-asc': 'Name ascending',
          'name-desc': 'Name descending',
          'size-asc': 'Size ascending',
          'size-desc': 'Size descending',
          'date-asc': 'Date ascending',
          'date-desc': 'Date descending',
          'type-asc': 'Type ascending',
          'type-desc': 'Type descending',
        } satisfies Record<(typeof sortModes)[number]['id'], string>
      )[modeId];
    },
    [locale],
  );
  const getDocumentSectionTitle = useCallback(
    (sectionId: DocumentSectionId) => {
      if (locale !== 'en') {
        return documentSections.find(section => section.id === sectionId)?.title ?? 'Belgeler';
      }

      return (
        {
          pdf: 'PDF files',
          word: 'Word',
          excel: 'Excel',
          other: 'Other',
        } satisfies Record<DocumentSectionId, string>
      )[sectionId];
    },
    [locale],
  );
  const getSocialAppLabel = useCallback(
    (appId: SocialAppId) => socialAppLabels[appId],
    [],
  );
  const getSocialSectionTitle = useCallback(
    (sectionId: string) => {
      if (locale !== 'en') {
        return (
          socialSectionsByApp.whatsapp.find(section => section.id === sectionId)?.title ??
          socialSectionsByApp.telegram.find(section => section.id === sectionId)?.title ??
          socialSectionsByApp.instagram.find(section => section.id === sectionId)?.title ??
          sectionId
        );
      }

      return (
        {
          'whatsapp-default': 'WhatsApp Account',
          'whatsapp-business': 'WhatsApp Business',
          telegram: 'Telegram',
          instagram: 'Instagram',
        } satisfies Record<string, string>
      )[sectionId] ?? sectionId;
    },
    [locale],
  );
  const getSocialGroupLabel = useCallback(
    (groupId: SocialGroupId) => {
      if (locale !== 'en') {
        return socialGroupLabels[groupId];
      }

      return (
        {
          documents: 'Documents',
          images: 'Images',
          audio: 'Audio',
          video: 'Videos',
          files: 'Files',
          voice: 'Voice Notes',
          music: 'Music',
        } satisfies Record<SocialGroupId, string>
      )[groupId];
    },
    [locale],
  );
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
  const gridColumns =
    explorer.activeDirectoryCategoryId === 'images' && viewMode === 'large-icons'
      ? 2
      : isMediaFolderGrid || viewMode === 'small-icons'
        ? 4
        : 3;
  const topMenuOffset = isSearchOpen ? 94 : 56;
  const isAppsView =
    explorer.mode === 'placeholder' && explorer.placeholderView?.kind === 'apps-info';
  const isAppsGridView = isAppsView && (viewMode === 'large-icons' || viewMode === 'small-icons');
  const appGridColumns = viewMode === 'large-icons' || windowWidth < 380 ? 2 : 4;
  const isRecentFilesView =
    explorer.mode === 'browser' && explorer.activeDirectoryCategoryId === 'recent';

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
  const visibleRecentNodes = useMemo(
    () =>
      isRecentFilesView
        ? filteredNodes.filter(shouldIncludeRecentNode)
        : filteredNodes,
    [filteredNodes, isRecentFilesView],
  );
  const recentSections = useMemo(
    () =>
      groupRecentNodesByDay(
        [...visibleRecentNodes].sort(
          (leftNode, rightNode) =>
            new Date(rightNode.modifiedAt).getTime() -
            new Date(leftNode.modifiedAt).getTime(),
        ),
      ),
    [visibleRecentNodes],
  );
  const selectedInstalledApp = useMemo(
    () =>
      selectedAppPackage
        ? installedApps.find(app => app.packageName === selectedAppPackage) ?? null
        : null,
    [installedApps, selectedAppPackage],
  );

  const sortedInstalledApps = useMemo(() => {
    const sorted = [...installedApps];
    sorted.sort((leftApp, rightApp) => {
      switch (sortModeId) {
        case 'name-desc':
          return rightApp.label.localeCompare(leftApp.label, 'tr');
        case 'size-asc':
          return leftApp.sizeBytes - rightApp.sizeBytes;
        case 'size-desc':
          return rightApp.sizeBytes - leftApp.sizeBytes;
        case 'date-asc':
          return new Date(leftApp.installedAt).getTime() - new Date(rightApp.installedAt).getTime();
        case 'type-asc':
          return leftApp.packageName.localeCompare(rightApp.packageName, 'tr');
        case 'type-desc':
          return rightApp.packageName.localeCompare(leftApp.packageName, 'tr');
        case 'date-desc':
          return new Date(rightApp.installedAt).getTime() - new Date(leftApp.installedAt).getTime();
        case 'name-asc':
        default:
          return leftApp.label.localeCompare(rightApp.label, 'tr');
      }
    });
    return sorted;
  }, [installedApps, sortModeId]);

  const refreshInstalledApps = useCallback(
    async (options: {showLoading?: boolean} = {}) => {
      try {
        if (options.showLoading) {
          setAppsLoading(true);
        }

        const applications = await localFileSystemBridge.listInstalledApps(false);
        setInstalledApps(applications);
        setSelectedAppPackage(currentPackage =>
          currentPackage != null &&
          applications.some(app => app.packageName === currentPackage)
            ? currentPackage
            : null,
        );
      } catch (error) {
        setInteractionError(
          error instanceof Error
            ? error.message
            : locale === 'en'
              ? 'Applications could not be loaded.'
              : 'Uygulamalar yüklenemedi.',
        );
      } finally {
        if (options.showLoading) {
          setAppsLoading(false);
        }
      }
    },
    [locale],
  );

  const refreshStorageStats = useCallback(async () => {
    try {
      setStorageStats(await localFileSystemBridge.getStorageStats());
    } catch {
      setStorageStats(null);
    }
  }, []);

  const homeStorageItems = useMemo(() => {
    const internalStorageCard = storageCards[0]
      ? {
          ...storageCards[0],
          ...(locale === 'en'
            ? {
                title: 'Internal Storage',
                subtitle: 'Primary device storage',
              }
            : {}),
          ...(storageStats
            ? {
                usedLabel: formatBytes(storageStats.usedBytes),
                totalLabel: formatBytes(storageStats.totalBytes),
                usageRatio:
                  storageStats.totalBytes > 0
                    ? storageStats.usedBytes / storageStats.totalBytes
                    : 0,
              }
            : {}),
        }
      : null;
    const fixedStorageCards = storageCards.slice(1).map(item =>
      locale === 'en'
        ? {
            ...item,
            title:
              item.id === 'system'
                ? 'System Files'
                : item.id === 'downloads'
                  ? 'Downloads'
                  : item.title,
            subtitle:
              item.id === 'system'
                ? 'Protected Android areas'
                : item.id === 'downloads'
                  ? 'Downloaded files'
                  : item.subtitle,
            usedLabel:
              item.id === 'downloads' && storageStats
                ? formatBytes(storageStats.downloadsSizeBytes)
                : item.usedLabel,
            totalLabel:
              item.id === 'downloads' && storageStats ? 'folder' : item.totalLabel,
          }
        : {
            ...item,
            usedLabel:
              item.id === 'downloads' && storageStats
                ? formatBytes(storageStats.downloadsSizeBytes)
                : item.usedLabel,
            totalLabel:
              item.id === 'downloads' && storageStats ? 'klasörü' : item.totalLabel,
          },
    );
    const resolvedStorageCards: ExplorerStorageCardItem[] = [
      ...(internalStorageCard ? [internalStorageCard] : []),
      ...(sdRoots.length > 0
        ? [
            {
              id: 'sd-card' as const,
              title: 'SD kart',
              subtitle: 'Harici depolama',
              usedLabel: locale === 'en' ? 'Ready' : 'Bağlı',
              totalLabel: locale === 'en' ? 'available' : 'hazır',
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
              usedLabel: locale === 'en' ? 'Ready' : 'Bağlı',
              totalLabel: locale === 'en' ? 'available' : 'hazır',
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
  }, [explorer.mode, locale, sdRoots.length, searchQuery, storageStats, usbRoots.length]);

  const homeShortcutItems = useMemo(() => {
    const localizedShortcuts =
      locale === 'en'
        ? homeShortcuts.map(item => ({
            ...item,
            title:
              (
                {
                  images: 'Images',
                  audio: 'Audio',
                  video: 'Videos',
                  documents: 'Documents',
                  apps: 'Applications',
                  recent: 'Recent Files',
                  cloud: 'Cloud',
                  network: 'PC Access',
                  whatsapp: 'WhatsApp',
                  telegram: 'Telegram',
                  instagram: 'Instagram',
                } as Record<string, string>
              )[item.id] ?? item.title,
            subtitle:
              (
                {
                  images: 'Photos and screenshots',
                  audio: 'Music and recordings',
                  video: 'Movies and clips',
                  documents: 'PDF, DOCX and work files',
                  apps: 'APK and installed packages',
                  recent: 'Recently added content',
                  cloud: 'Connected accounts and providers',
                  network: 'LAN sharing and desktop access',
                  whatsapp: 'WhatsApp media and files',
                  telegram: 'Telegram media and files',
                  instagram: 'Instagram media folders',
                } as Record<string, string>
              )[item.id] ?? item.subtitle,
          }))
        : homeShortcuts;

    if (!searchQuery.trim() || explorer.mode !== 'home') {
      return localizedShortcuts;
    }

    const normalizedQuery = searchQuery.trim().toLocaleLowerCase('tr-TR');
    return localizedShortcuts.filter(item =>
      item.title.toLocaleLowerCase('tr-TR').includes(normalizedQuery),
    );
  }, [explorer.mode, locale, searchQuery]);

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
      void refreshStorageStats();
    }, [refreshRemovableStorageRoots, refreshStorageStats]),
  );

  useEffect(() => {
    if (!isAppsView) {
      setInstalledApps([]);
      setSelectedAppPackage(null);
      return;
    }

    void refreshInstalledApps({showLoading: true});
  }, [isAppsView, refreshInstalledApps]);

  useFocusEffect(
    useCallback(() => {
      if (!isAppsView) {
        return undefined;
      }

      void refreshInstalledApps();
      return undefined;
    }, [isAppsView, refreshInstalledApps]),
  );

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

        if (explorer.selectedNodeIds.length > 0) {
          explorer.clearSelection();
          return true;
        }

        if (selectedAppPackage) {
          setSelectedAppPackage(null);
          return true;
        }

        if (socialExplorer?.groupId != null) {
          setSocialExplorer(currentState =>
            currentState
              ? {
                  ...currentState,
                  accountId: 'default',
                  groupId: null,
                  groupLabel: null,
                  nodes: [],
                  isLoading: false,
                }
              : currentState,
          );
          return true;
        }

        if (explorer.mode !== 'home') {
          explorer.goBack();
          return true;
        }

        Alert.alert(t('explorer.exitTitle'), t('explorer.exitMessage'), [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('explorer.exitConfirm'),
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
      explorer.clearSelection,
      explorer.goBack,
      explorer.mode,
      explorer.selectedNodeIds.length,
      isDrawerOpen,
      isMoreMenuOpen,
      isSearchOpen,
      isSortMenuOpen,
      selectedAppPackage,
      socialExplorer?.groupId,
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
      const logicalRootLabel =
        homeShortcuts.find(item => item.id === entryId)?.title ??
        storageCards.find(item => item.id === entryId)?.title ??
        null;

      try {
        setSocialExplorer(null);
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
              logicalRootPath: sdRoot,
              logicalRootLabel: logicalRootLabel ?? 'SD kart',
            }, {resetHistory: true});
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
              logicalRootPath: usbRoot,
              logicalRootLabel: logicalRootLabel ?? 'USB',
            }, {resetHistory: true});
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

        if (
          entryId === 'whatsapp' ||
          entryId === 'telegram' ||
          entryId === 'instagram'
        ) {
          const action = resolveExplorerCategoryAction(entryId);
          setSocialExplorer({
            appId: entryId,
            accountId: 'default',
            groupId: null,
            groupLabel: null,
            nodes: [],
            isLoading: false,
          });
          if (action.kind === 'placeholder') {
            explorer.openPlaceholderView(action.placeholder);
          }
          return;
        }

        const action = resolveExplorerCategoryAction(entryId);
        if (action.kind === 'directory') {
          explorer.openBrowserPath(action.path, {
            categoryId: action.categoryId,
            emptyState: action.emptyState,
            logicalRootPath: action.path,
            logicalRootLabel: logicalRootLabel ?? action.categoryId,
          }, {resetHistory: true});
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
          logicalRootPath: action.path,
          logicalRootLabel:
            locationId === 'internal-storage'
              ? locale === 'en'
                ? 'Internal storage'
                : 'Ana bellek'
              : action.categoryId,
        }, {resetHistory: true});
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
        const nextName = node.name.startsWith('.')
          ? node.name.replace(/^\.+/, '')
          : `.${node.name}`;
        if (nextName && nextName !== node.name) {
          await localFileSystemBridge.renameEntry(node.path, nextName);
        }
      }

      explorer.clearSelection();
      explorer.requestReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Göster/Gizle işlemi tamamlanamadı.';
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

    const selectedApp =
      installedApps.find(app => app.packageName === selectedAppPackage) ?? null;

    if (selectedApp?.canUninstall === false) {
      Alert.alert(
        locale === 'en' ? 'Removal unavailable' : 'Kaldırma kullanılamıyor',
        locale === 'en'
          ? 'This application cannot be removed from Android uninstall flow.'
          : 'Bu uygulama Android kaldırma akışıyla kaldırılamaz.',
      );
      return;
    }

    try {
      const result = await localFileSystemBridge.uninstallPackage(selectedAppPackage);
      setSelectedAppPackage(null);

      if (result.status === 'uninstalled') {
        await refreshInstalledApps();
      } else {
        await refreshInstalledApps();
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : locale === 'en'
            ? 'The uninstall screen could not be opened.'
            : 'Uygulama kaldırma ekranı açılamadı.';
      Alert.alert(
        locale === 'en' ? 'Removal failed' : 'Kaldırma başarısız',
        message,
      );
    }
  }, [installedApps, locale, refreshInstalledApps, selectedAppPackage]);

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

  const handleEmptyTrash = useCallback(async () => {
    if (!isTrashView || explorer.nodes.length === 0) {
      return;
    }

    try {
      for (const node of explorer.nodes) {
        await localFileSystemBridge.deleteEntry(node.path);
        removeTrashEntry(node.path);
      }
      explorer.clearSelection();
      explorer.requestReload();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Çöp kutusu boşaltılamadı.';
      Alert.alert('Boşaltma başarısız', message);
    }
  }, [explorer, isTrashView, removeTrashEntry]);

  const confirmDeleteSelection = useCallback(async () => {
    if (selectedNodes.length === 0) {
      setDeleteConfirmVisible(false);
      return;
    }

    try {
      if (isTrashView || deletePermanently) {
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
  }, [deletePermanently, explorer, isTrashView, removeFavoriteItem, removeTrashEntry, selectedNodes, upsertTrashEntry]);

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
      void Promise.all([refreshRemovableStorageRoots(), refreshStorageStats()]).finally(
        () => setRefreshing(false),
      );
    }
    if (isAppsView) {
      void refreshInstalledApps({showLoading: true}).finally(() =>
        setRefreshing(false),
      );
    }
    setMoreMenuOpen(false);
  }, [
    explorer,
    isAppsView,
    refreshInstalledApps,
    refreshRemovableStorageRoots,
    refreshStorageStats,
  ]);

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
      const logicalRootPath = explorer.logicalRootPath;
      const logicalRootLabel = explorer.logicalRootLabel;

      if (logicalRootPath && logicalRootLabel && path.startsWith(logicalRootPath)) {
        const items: BreadcrumbItem[] = [{label: logicalRootLabel, path: logicalRootPath}];
        const currentSegments = path.split('/').filter(Boolean);
        const rootSegments = logicalRootPath.split('/').filter(Boolean);
        const nestedSegments = currentSegments.slice(rootSegments.length);
        let currentSegmentPath = logicalRootPath;

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
    explorer.currentPath,
    explorer.logicalRootLabel,
    explorer.logicalRootPath,
    explorer.mode,
    explorer.placeholderView,
    explorer.previewNode,
  ]);

  const headerTitle = useMemo(() => {
    if (explorer.mode === 'home') {
      return t('app.title');
    }
    if (documentSectionFilter != null) {
      return getDocumentSectionTitle(documentSectionFilter);
    }
    return currentBreadcrumbs.at(-1)?.label ?? t('app.title');
  }, [currentBreadcrumbs, documentSectionFilter, explorer.mode, getDocumentSectionTitle, t]);

  const handlePressBreadcrumbSegment = useCallback(
    (index: number) => {
      const target = currentBreadcrumbs[index];
      if (!target) {
        return;
      }

      explorer.openBrowserPath(target.path, {
        categoryId: explorer.activeDirectoryCategoryId,
        emptyState: explorer.activeEmptyState,
        logicalRootPath: explorer.logicalRootPath,
        logicalRootLabel: explorer.logicalRootLabel,
      }, {resetHistory: true});
    },
    [currentBreadcrumbs, explorer],
  );

  const searchPlaceholder =
    explorer.mode === 'home' ? t('explorer.searchHome') : t('explorer.searchFolder');

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
            logicalRootPath: explorer.logicalRootPath,
            logicalRootLabel: explorer.logicalRootLabel,
          });
          return;
        }
      }

      void explorer.openNode(node);
    },
    [explorer, searchQuery],
  );

  const loadSocialGroup = useCallback(
    async (group: SocialGroupDescriptor) => {
      if (!socialExplorer) {
        return;
      }

      const appId = socialExplorer.appId;
      setSocialExplorer(currentState =>
        currentState
          ? {
              ...currentState,
              accountId: group.accountId,
              groupId: group.id,
              groupLabel: getSocialGroupLabel(group.id),
              nodes: [],
              isLoading: true,
            }
          : currentState,
      );

      try {
        const uniquePaths = new Set<string>();
        const socialNodes = await localFileSystemBridge.listSocialMediaFiles(
          appId,
          group.accountId,
          group.id,
          showHiddenFiles,
          0,
        );
        const nextNodes = socialNodes
          .filter(node => {
            if (uniquePaths.has(node.path)) {
              return false;
            }
            uniquePaths.add(node.path);
            return true;
          })
          .sort(
            (leftNode, rightNode) =>
              new Date(rightNode.modifiedAt).getTime() -
              new Date(leftNode.modifiedAt).getTime(),
          );

        setSocialExplorer(currentState =>
          currentState
            ? {
                ...currentState,
                accountId: group.accountId,
                groupId: group.id,
                groupLabel: getSocialGroupLabel(group.id),
                nodes: nextNodes,
                isLoading: false,
              }
            : currentState,
        );
      } catch (error) {
        setInteractionError(
          error instanceof Error
            ? error.message
            : locale === 'en'
              ? 'Social folder content could not be loaded.'
              : 'Sosyal klasör içerikleri yüklenemedi.',
        );
        setSocialExplorer(currentState =>
          currentState
            ? {
                ...currentState,
                accountId: group.accountId,
                groupId: group.id,
                groupLabel: getSocialGroupLabel(group.id),
                nodes: [],
                isLoading: false,
              }
            : currentState,
        );
      }
    },
    [getSocialGroupLabel, locale, showHiddenFiles, socialExplorer],
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
      const trashLeftMeta =
        trashEntry
          ? item.kind === 'file'
            ? formatBytes(item.sizeBytes).toLowerCase()
            : `${item.childCount ?? 0} öğe`
          : undefined;
      const trashRightMeta = trashEntry
        ? formatAbsoluteDate(trashEntry.deletedAt)
        : undefined;

      return (
        <FileListItem
          density={viewMode === 'compact' ? 'compact' : 'details'}
          node={item}
          onLongPress={explorer.toggleSelection}
          onPress={handleVisibleNodePress}
          {...(trashRightMeta ? {rightMetaOverride: trashRightMeta} : {})}
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
      const isLargeImageGrid =
        explorer.activeDirectoryCategoryId === 'images' &&
        viewMode === 'large-icons';
      const shouldShowPreview =
        (viewMode === 'large-icons' || isMediaFolderGrid) && isImageNode(item);
      const shouldShowVideoPreview =
        (viewMode === 'large-icons' || isMediaFolderGrid) && isVideoNode(item);
      const isApkFile = isApkNode(item);

      return (
        <Pressable
          onLongPress={() => explorer.toggleSelection(item)}
          onPress={() => handleVisibleNodePress(item)}
          style={({pressed}) => ({
            flex: 1,
            aspectRatio: isLargeImageGrid ? 1 : undefined,
            minHeight: isLargeImageGrid
              ? undefined
              : isMediaFolderGrid || viewMode === 'large-icons'
                ? 118
                : 96,
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
                  ...(isLargeImageGrid ? {width: 92, height: 92} : {}),
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
            ) : (
              <View style={{alignItems: 'center', justifyContent: 'center'}}>
                {renderNodeTypeIcon(item, {
                  size: isMediaFolderGrid || viewMode === 'large-icons' ? 26 : 20,
                  directoryColor: theme.colors.text,
                  fileColor: theme.colors.primary,
                })}
                {isApkFile ? (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: -8,
                      paddingHorizontal: 4,
                      paddingVertical: 1,
                      backgroundColor: 'rgba(255,255,255,0.9)',
                    }}>
                    <AppText style={{fontSize: 9, color: theme.colors.primary}}>APK</AppText>
                  </View>
                ) : null}
              </View>
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
                  {getDocumentSectionTitle(section.id)}
                </AppText>
                <Pressable
                  disabled={sectionNodes.length === 0}
                  onPress={() => setDocumentSectionFilter(section.id)}
                  style={{paddingVertical: theme.spacing.xs}}>
                  <AppText
                    tone={sectionNodes.length === 0 ? 'muted' : 'default'}
                    style={{fontSize: theme.typography.caption}}>
                    {locale === 'en' ? '> All' : '> Tümü'}
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
                  description={
                    locale === 'en'
                      ? 'No documents were found in this category.'
                      : 'Bu türde belge bulunamadı.'
                  }
                  icon="documents"
                  title={locale === 'en' ? 'List is empty' : 'Liste boş'}
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
      getDocumentSectionTitle,
      handleRefreshCurrent,
      handleVisibleNodePress,
      isRefreshing,
      locale,
      selectedIdSet,
      theme,
    ],
  );

  const renderSocialExplorer = useCallback(() => {
    if (!socialExplorer) {
      return null;
    }

    if (socialExplorer.groupId == null) {
      const sections = socialSectionsByApp[socialExplorer.appId];

      return (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.md,
            paddingBottom: contentBottomInset,
            gap: theme.spacing.md,
          }}
          showsVerticalScrollIndicator={false}>
          <View>
            <AppText style={{fontSize: theme.typography.title}} weight="bold">
              {getSocialAppLabel(socialExplorer.appId)}
            </AppText>
            <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
              {locale === 'en'
                ? 'Content is grouped by media type.'
                : 'İçerikleri türe göre gruplanır.'}
            </AppText>
          </View>
          {sections.map(section => (
            <View key={section.id} style={{gap: theme.spacing.sm}}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                }}>
                <AppText style={{fontSize: theme.typography.body}} weight="semibold">
                  {getSocialSectionTitle(section.id)}
                </AppText>
                <View style={{height: 1, flex: 1, backgroundColor: theme.colors.border}} />
              </View>
              {section.groups.map(group => (
                <Pressable
                  key={`${group.accountId}-${group.id}`}
                  onPress={() => {
                    void loadSocialGroup(group);
                  }}
                  style={({pressed}) => ({
                    opacity: pressed ? 0.82 : 1,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.md,
                  })}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md}}>
                      {group.id === 'documents' ? (
                        <FileText color={theme.colors.primary} size={20} />
                      ) : group.id === 'images' ? (
                        <ImageIcon color={theme.colors.primary} size={20} />
                      ) : group.id === 'audio' || group.id === 'music' || group.id === 'voice' ? (
                        <HardDrive color={theme.colors.primary} size={20} />
                      ) : group.id === 'video' ? (
                        <VideoIcon color={theme.colors.primary} size={20} />
                      ) : (
                        <Folder color={theme.colors.primary} size={20} />
                      )}
                      <AppText weight="semibold">{getSocialGroupLabel(group.id)}</AppText>
                    </View>
                    <AppText tone="muted">{t('common.open')}</AppText>
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>
      );
    }

    return (
      <FlatList
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.md,
          paddingTop: theme.spacing.md,
          paddingBottom: contentBottomInset,
          flexGrow: 1,
        }}
        data={socialExplorer.nodes}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <View style={{marginBottom: theme.spacing.md}}>
            <AppText style={{fontSize: theme.typography.title}} weight="bold">
              {getSocialAppLabel(socialExplorer.appId)} -{' '}
              {socialExplorer.groupLabel ??
                getSocialGroupLabel(socialExplorer.groupId)}
            </AppText>
          </View>
        }
        ListEmptyComponent={
          socialExplorer.isLoading ? (
            <View style={{paddingVertical: theme.spacing.xxl}}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : (
            <EmptyState
              description={
                locale === 'en'
                  ? 'No matching files were found in this group.'
                  : 'Bu grupta ilgili dosya bulunamadı.'
              }
              icon="folder"
              title={locale === 'en' ? 'List is empty' : 'Liste boş'}
            />
          )
        }
        renderItem={({item}) => (
          <FileListItem
            density={viewMode === 'compact' ? 'compact' : 'details'}
            node={item}
            onLongPress={explorer.toggleSelection}
            onPress={handleVisibleNodePress}
            selected={selectedIdSet.has(item.id)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{height: theme.spacing.sm}} />}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [
    contentBottomInset,
    explorer.toggleSelection,
    getSocialAppLabel,
    getSocialGroupLabel,
    getSocialSectionTitle,
    handleVisibleNodePress,
    locale,
    loadSocialGroup,
    selectedIdSet,
    socialExplorer,
    theme,
    t,
    viewMode,
  ]);

  const renderInstalledAppItem = useCallback(
    ({item}: {item: InstalledAppItem}) => (
      <Pressable
        delayLongPress={220}
        onPress={() =>
          setSelectedAppPackage(currentPackage =>
            currentPackage === item.packageName ? null : item.packageName,
          )
        }
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
        <View style={{alignItems: 'flex-end', gap: theme.spacing.xs}}>
          <Download color={theme.colors.textMuted} size={14} />
          <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
            {formatAbsoluteDate(item.installedAt)}
          </AppText>
        </View>
      </Pressable>
    ),
    [selectedAppPackage, theme],
  );

  const renderInstalledAppGridItem = useCallback(
    ({item}: {item: InstalledAppItem}) => (
      <Pressable
        onPress={() =>
          setSelectedAppPackage(currentPackage =>
            currentPackage === item.packageName ? null : item.packageName,
          )
        }
        onLongPress={() => setSelectedAppPackage(item.packageName)}
        style={({pressed}) => ({
          flex: 1,
          minHeight: viewMode === 'large-icons' ? 156 : 116,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor:
            selectedAppPackage === item.packageName
              ? theme.colors.primaryMuted
              : theme.colors.surface,
          padding: theme.spacing.sm,
          opacity: pressed ? 0.82 : 1,
        })}>
        {item.iconBase64 ? (
          <Image
            source={{uri: `data:image/png;base64,${item.iconBase64}`}}
            style={{
              width: viewMode === 'large-icons' ? 58 : 38,
              height: viewMode === 'large-icons' ? 58 : 38,
            }}
          />
        ) : (
          <View
            style={{
              width: viewMode === 'large-icons' ? 58 : 38,
              height: viewMode === 'large-icons' ? 58 : 38,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceMuted,
            }}>
            <AppText>{item.label.slice(0, 1)}</AppText>
          </View>
        )}
        <AppText
          numberOfLines={2}
          style={{
            marginTop: theme.spacing.sm,
            textAlign: 'center',
            fontSize: theme.typography.caption,
          }}>
          {item.label}
        </AppText>
        <AppText tone="muted" style={{marginTop: theme.spacing.xs, fontSize: theme.typography.caption - 1}}>
          {formatAbsoluteDate(item.installedAt)}
        </AppText>
      </Pressable>
    ),
    [selectedAppPackage, theme, viewMode],
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
          supportingText={
            locale === 'en'
              ? 'Try another folder or check the storage permission.'
              : 'Farklı bir klasöre geçebilir veya depolama erişim iznini kontrol edebilirsiniz.'
          }
          title={locale === 'en' ? 'Folder unavailable' : 'Klasör açılamadı'}
        />
      );
    }
    if (searchQuery.trim()) {
      return (
        <EmptyState
          description={
            locale === 'en'
              ? 'Try changing the search criteria.'
              : 'Arama ölçütünü değiştirmeyi deneyebilirsiniz.'
          }
          icon="folder"
          supportingText={
            locale === 'en'
              ? 'No matching items were found in this location or its subfolders.'
              : 'Bu konum ve alt klasörlerde aradığınız adla eşleşen öğe bulunamadı.'
          }
          title={locale === 'en' ? 'No results found' : 'Sonuç bulunamadı'}
        />
      );
    }

    const emptyState = explorer.activeEmptyState ?? genericDirectoryEmptyState;
    return (
      <EmptyState
        description={
          explorer.activeEmptyState
            ? emptyState.description
            : locale === 'en'
              ? 'This location is empty right now. You can switch to another folder or create a new file.'
              : emptyState.description
        }
        icon={emptyState.icon}
        supportingText={
          locale === 'en'
            ? 'New content will appear here when it is added to this folder.'
            : 'Bu klasöre yeni içerik eklendiğinde burada görünür.'
        }
        title={
          explorer.activeEmptyState
            ? emptyState.title
            : locale === 'en'
              ? 'This folder does not have content yet'
              : emptyState.title
        }
      />
    );
  }, [
    explorer.activeEmptyState,
    explorer.errorMessage,
    explorer.isLoading,
    isSearchLoading,
    searchQuery,
    locale,
    t,
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
      {...(explorer.mode !== 'home' ||
      explorer.selectedNodeIds.length > 0 ||
      selectedAppPackage != null
        ? {
            onNavigateBack: () => {
              if (explorer.selectedNodeIds.length > 0) {
                explorer.clearSelection();
                return;
              }
              if (selectedAppPackage) {
                setSelectedAppPackage(null);
                return;
              }
              explorer.goBack();
            },
          }
        : {})}
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
      {storageAccessStatus === 'missing' && explorer.mode !== 'home' ? (
        <StorageAccessPrompt onGrantAccess={requestStorageAccess} />
      ) : null}
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
        onDelete={() => {
          if (isTrashView) {
            void confirmDeleteSelection();
            return;
          }
          handleDeleteSelection();
        }}
        onEmptyTrash={handleEmptyTrash}
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
            {selectedInstalledApp?.canUninstall === false
              ? locale === 'en'
                ? 'Cannot remove'
                : 'Kaldırılamaz'
              : locale === 'en'
                ? 'Remove'
                : 'Kaldır'}
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
            <AppText weight="bold">{t('explorer.menu.viewMode')}</AppText>
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
                      <AppText weight={isActive ? 'bold' : 'semibold'}>
                        {getViewModeLabel(modeOption.id)}
                      </AppText>
                    </View>
                    {isActive ? <Check color={theme.colors.primary} size={16} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={{height: 1, backgroundColor: theme.colors.border, marginVertical: theme.spacing.sm}} />
            <AppText weight="bold">{t('explorer.menu.sort')}</AppText>
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
                      <AppText weight={isActive ? 'bold' : 'semibold'}>
                        {getSortModeLabel(modeOption.id)}
                      </AppText>
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
                <AppText weight="semibold">{t('explorer.menu.new')}</AppText>
              </View>
              <AppText tone="muted">{isCreateMenuOpen ? '−' : '+'}</AppText>
            </Pressable>
            {isCreateMenuOpen ? (
              <View style={{marginLeft: theme.spacing.md, marginBottom: theme.spacing.sm, gap: theme.spacing.xs}}>
                <Pressable onPress={openCreateTextModal} style={{paddingVertical: theme.spacing.sm}}>
                  <AppText>{t('explorer.menu.newText')}</AppText>
                </Pressable>
                <Pressable onPress={openCreateFolderModal} style={{paddingVertical: theme.spacing.sm}}>
                  <AppText>{t('explorer.menu.newFolder')}</AppText>
                </Pressable>
              </View>
            ) : null}
            <Pressable onPress={handleOpenAnalysis} style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm}}>
              <ImageIcon color={theme.colors.primary} size={16} />
              <AppText weight="semibold">{t('explorer.menu.analyze')}</AppText>
            </Pressable>
            <Pressable onPress={handleRefreshCurrent} style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm}}>
              <RefreshCcw color={theme.colors.primary} size={16} />
              <AppText weight="semibold">{t('explorer.menu.refresh')}</AppText>
            </Pressable>
            <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: theme.spacing.sm}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
                {showHiddenFiles ? <EyeOff color={theme.colors.primary} size={16} /> : <Eye color={theme.colors.primary} size={16} />}
                <AppText weight="semibold">{t('explorer.menu.hiddenFiles')}</AppText>
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
              <AppText weight="semibold">{t('explorer.menu.settings')}</AppText>
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
            key={isAppsGridView ? `apps-grid-${appGridColumns}` : 'apps-list'}
            columnWrapperStyle={isAppsGridView ? {gap: theme.spacing.sm, marginBottom: theme.spacing.sm} : undefined}
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
            data={sortedInstalledApps}
            keyExtractor={item => item.packageName}
            ListEmptyComponent={
              isAppsLoading ? (
                <View style={{paddingVertical: theme.spacing.xxl}}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : (
                <EmptyState
                  title={t('explorer.empty.noAppsTitle')}
                  description={t('explorer.empty.noAppsDescription')}
                  supportingText={t('explorer.empty.noAppsSupporting')}
                  icon="apps"
                />
              )
            }
            numColumns={isAppsGridView ? appGridColumns : 1}
            renderItem={isAppsGridView ? renderInstalledAppGridItem : renderInstalledAppItem}
            showsVerticalScrollIndicator={false}
          />
        ) : explorer.mode === 'placeholder' &&
          explorer.placeholderView?.kind === 'social-groups' &&
          socialExplorer ? (
          renderSocialExplorer()
        ) : explorer.mode === 'placeholder' && explorer.placeholderView ? (
          <ScrollView
            contentContainerStyle={{paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: contentBottomInset}}
            showsVerticalScrollIndicator={false}>
            <ExplorerPlaceholderView
              onBack={explorer.goBack}
              onProvidersChanged={hydrateProviders}
              placeholder={explorer.placeholderView}
              providers={providers}
            />
          </ScrollView>
        ) : explorer.mode === 'preview' && explorer.previewNode ? (
          <ScrollView
            contentContainerStyle={{paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: contentBottomInset}}
            showsVerticalScrollIndicator={false}>
            <FilePreviewView
              initialIndex={Math.max(
                0,
                filteredNodes.filter(isImageNode).findIndex(
                  imageNode => imageNode.path === explorer.previewNode?.path,
                ),
              )}
              node={explorer.previewNode}
              onBack={explorer.goBack}
              previewNodes={filteredNodes}
            />
          </ScrollView>
        ) : isDocumentsRootView && documentSectionFilter == null ? (
          renderDocumentSections()
        ) : isRecentFilesView ? (
          <SectionList
            contentContainerStyle={{
              paddingHorizontal: theme.spacing.md,
              paddingTop: theme.spacing.md,
              paddingBottom: contentBottomInset,
              flexGrow: 1,
            }}
            extraData={explorer.selectedNodeIds}
            initialNumToRender={12}
            keyExtractor={item => item.id}
            ListEmptyComponent={emptyComponent}
            refreshControl={
              <RefreshControl
                onRefresh={handleRefreshCurrent}
                refreshing={isRefreshing}
                tintColor={theme.colors.primary}
              />
            }
            renderItem={renderListItem}
            renderSectionFooter={() => <View style={{height: theme.spacing.md}} />}
            renderSectionHeader={({section}) => (
              <View
                style={{
                  paddingTop: theme.spacing.sm,
                  paddingBottom: theme.spacing.xs,
                  backgroundColor: theme.colors.background,
                }}>
                <AppText
                  style={{fontSize: theme.typography.caption}}
                  tone="muted"
                  weight="semibold">
                  {section.title}
                </AppText>
              </View>
            )}
            sections={recentSections}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
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
              <AppText weight="bold">{t('explorer.modal.confirmDelete')}</AppText>
              <View>
                <AppText weight="semibold">
                  {primarySelectedNode
                    ? primarySelectedNode.name
                    : t('selection.selectedCount', {count: selectedNodes.length})}
                </AppText>
                <AppText tone="muted" style={{fontSize: theme.typography.caption, marginTop: theme.spacing.xs}}>
                  {primarySelectedNode
                    ? `${getNodeSummary(primarySelectedNode)}  •  ${formatAbsoluteDate(primarySelectedNode.modifiedAt)}`
                    : locale === 'en'
                      ? `${selectedNodes.length} items will be deleted`
                      : `${selectedNodes.length} öğe silinecek`}
                </AppText>
              </View>
              <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
                {t('explorer.modal.trashInfo')}
              </AppText>
              <View style={{flexDirection: 'row', justifyContent: 'flex-end', gap: theme.spacing.sm}}>
                <Pressable onPress={() => { setDeleteConfirmVisible(false); setDeletePermanently(false); }} style={{borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm}}>
                  <AppText weight="semibold">{t('common.cancel')}</AppText>
                </Pressable>
                <Pressable onPress={() => { void confirmDeleteSelection(); }} style={{backgroundColor: theme.colors.danger, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm}}>
                  <AppText style={{color: '#FFFFFF'}} weight="semibold">{t('explorer.modal.delete')}</AppText>
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
                placeholder={t('explorer.modal.enterName')}
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
                  <AppText>{t('common.cancel')}</AppText>
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
                <AppText>
                  {locale === 'en' ? 'Remove from list' : 'Listeden Kaldır'}
                </AppText>
              </Pressable>
              <Pressable onPress={handleOpenRecentNodeLocation} style={{paddingVertical: theme.spacing.sm}}>
                <AppText>
                  {locale === 'en' ? 'Open file location' : 'Dosya Konumuna Git'}
                </AppText>
              </Pressable>
              <Pressable onPress={handleAddRecentNodeToFavorites} style={{paddingVertical: theme.spacing.sm}}>
                <AppText>
                  {locale === 'en' ? 'Add to favorites' : 'Favorilere Ekle'}
                </AppText>
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

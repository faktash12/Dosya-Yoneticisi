import type {StorageProviderScope} from '@/domain/entities/FileSystemNode';

export type ExplorerMode = 'home' | 'browser' | 'placeholder' | 'preview';

export type ExplorerCategoryId =
  | 'internal-storage'
  | 'downloads'
  | 'documents'
  | 'images'
  | 'audio'
  | 'video'
  | 'system'
  | 'cloud'
  | 'remote'
  | 'network'
  | 'trash'
  | 'apps'
  | 'recent';

export type ExplorerHomeEntryId = ExplorerCategoryId | 'sd-card';

export type ExplorerPlaceholderKind =
  | 'system-info'
  | 'cloud-hub'
  | 'remote-access'
  | 'network-access'
  | 'recycle-bin'
  | 'apps-info'
  | 'unsupported-category'
  | 'file-preview';

export type ExplorerDashboardIcon =
  | 'storage'
  | 'sd-card'
  | 'system'
  | 'downloads'
  | 'images'
  | 'audio'
  | 'video'
  | 'documents'
  | 'apps'
  | 'recent'
  | 'cloud'
  | 'remote'
  | 'network'
  | 'trash';

export type ExplorerEmptyStateIcon = ExplorerDashboardIcon | 'folder';

export interface ExplorerEmptyStateConfig {
  title: string;
  description: string;
  icon: ExplorerEmptyStateIcon;
}

export interface ExplorerPlaceholderView {
  id: string;
  kind: ExplorerPlaceholderKind;
  title: string;
  description: string;
  supportingLines?: string[];
  ctaLabel?: string;
}

export interface ExplorerDirectoryContext {
  categoryId: ExplorerCategoryId | null;
  emptyState: ExplorerEmptyStateConfig | null;
}

export type ExplorerCategoryAction =
  | {
      kind: 'directory';
      path: string;
      providerId: StorageProviderScope;
      categoryId: ExplorerCategoryId;
      emptyState: ExplorerEmptyStateConfig;
    }
  | {
      kind: 'placeholder';
      placeholder: ExplorerPlaceholderView;
    };

export interface ExplorerDashboardItem {
  id: string;
  categoryId: ExplorerCategoryId;
  title: string;
  subtitle: string;
  icon: ExplorerDashboardIcon;
}

export interface ExplorerStorageCardItem {
  id: ExplorerHomeEntryId;
  title: string;
  subtitle: string;
  usedLabel: string;
  totalLabel: string;
  usageRatio: number;
  icon: Extract<ExplorerDashboardIcon, 'storage' | 'sd-card' | 'downloads'>;
}

export interface ExplorerShortcutItem {
  id: ExplorerHomeEntryId;
  title: string;
  subtitle: string;
  icon: ExplorerDashboardIcon;
}

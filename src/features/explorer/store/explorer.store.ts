import {create} from 'zustand';

import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import type {
  ExplorerBrowserHistoryEntry,
  ExplorerCategoryId,
  ExplorerDirectoryContext,
  ExplorerEmptyStateConfig,
  ExplorerMode,
  ExplorerPlaceholderView,
} from '@/features/explorer/types/explorer.types';

interface ClipboardState {
  mode: 'copy' | 'cut';
  nodeIds: string[];
}

interface ExplorerState {
  mode: ExplorerMode;
  currentPath: string;
  placeholderView: ExplorerPlaceholderView | null;
  previewNode: FileSystemNode | null;
  nodes: FileSystemNode[];
  selectedNodeIds: string[];
  activeDirectoryCategoryId: ExplorerCategoryId | null;
  activeEmptyState: ExplorerEmptyStateConfig | null;
  logicalRootPath: string | null;
  logicalRootLabel: string | null;
  browserHistory: ExplorerBrowserHistoryEntry[];
  recentOpenedNodes: FileSystemNode[];
  // Deprecated: operation clipboard state is now managed by OperationClipboardService.
  clipboard: ClipboardState | null;
  isLoading: boolean;
  reloadVersion: number;
  errorMessage: string | null;
  openHome: () => void;
  openBrowser: (
    path: string,
    context?: ExplorerDirectoryContext | null,
    options?: {resetHistory?: boolean},
  ) => void;
  openPlaceholder: (placeholderView: ExplorerPlaceholderView) => void;
  openPreview: (node: FileSystemNode) => void;
  restorePreviousBrowser: () => void;
  setCurrentPath: (path: string) => void;
  setNodes: (nodes: FileSystemNode[]) => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  toggleSelection: (nodeId: string) => void;
  clearSelection: () => void;
  setClipboard: (clipboard: ClipboardState | null) => void;
  requestReload: () => void;
  recordRecentNode: (node: FileSystemNode) => void;
  removeRecentNode: (path: string) => void;
  clearRecentNodes: () => void;
}

const createDirectoryState = (
  currentPath: string,
  context?: ExplorerDirectoryContext | null,
) => ({
  mode: 'browser' as const,
  currentPath,
  placeholderView: null,
  previewNode: null,
  nodes: [],
  selectedNodeIds: [],
  activeDirectoryCategoryId: context?.categoryId ?? null,
  activeEmptyState: context?.emptyState ?? null,
  logicalRootPath: context?.logicalRootPath ?? null,
  logicalRootLabel: context?.logicalRootLabel ?? null,
  errorMessage: null,
  isLoading: true,
});

export const useExplorerStore = create<ExplorerState>(set => ({
  mode: 'home',
  currentPath: ROOT_DIRECTORY,
  placeholderView: null,
  previewNode: null,
  nodes: [],
  selectedNodeIds: [],
  activeDirectoryCategoryId: null,
  activeEmptyState: null,
  logicalRootPath: null,
  logicalRootLabel: null,
  browserHistory: [],
  recentOpenedNodes: [],
  clipboard: null,
  isLoading: false,
  reloadVersion: 0,
  errorMessage: null,
  openHome: () =>
    set({
      mode: 'home',
      currentPath: ROOT_DIRECTORY,
      placeholderView: null,
      previewNode: null,
      nodes: [],
      selectedNodeIds: [],
      activeDirectoryCategoryId: null,
      activeEmptyState: null,
      logicalRootPath: null,
      logicalRootLabel: null,
      browserHistory: [],
      errorMessage: null,
      isLoading: false,
    }),
  openBrowser: (currentPath, context, options) =>
    set(state => {
      const nextState = createDirectoryState(currentPath, context);
      const nextEntry: ExplorerBrowserHistoryEntry = {
        path: currentPath,
        context: context ?? null,
      };

      const browserHistory =
        options?.resetHistory || state.mode !== 'browser'
          ? [nextEntry]
          : state.browserHistory.length === 0
            ? [nextEntry]
            : state.browserHistory.at(-1)?.path === currentPath
              ? state.browserHistory
              : [...state.browserHistory, nextEntry];

      return {
        ...nextState,
        browserHistory,
      };
    }),
  openPlaceholder: placeholderView =>
    set(state => ({
      mode: 'placeholder',
      placeholderView,
      previewNode: null,
      selectedNodeIds: [],
      activeDirectoryCategoryId: state.activeDirectoryCategoryId,
      activeEmptyState: state.activeEmptyState,
      logicalRootPath: state.logicalRootPath,
      logicalRootLabel: state.logicalRootLabel,
      errorMessage: null,
      isLoading: false,
    })),
  openPreview: previewNode =>
    set(state => ({
      mode: 'preview',
      currentPath: state.currentPath,
      previewNode,
      placeholderView: null,
      selectedNodeIds: [],
      activeDirectoryCategoryId: state.activeDirectoryCategoryId,
      activeEmptyState: state.activeEmptyState,
      logicalRootPath: state.logicalRootPath,
      logicalRootLabel: state.logicalRootLabel,
      errorMessage: null,
      isLoading: false,
    })),
  restorePreviousBrowser: () =>
    set(state => {
      if (state.browserHistory.length <= 1) {
        return {
          mode: 'home' as const,
          currentPath: ROOT_DIRECTORY,
          placeholderView: null,
          previewNode: null,
          nodes: [],
          selectedNodeIds: [],
          activeDirectoryCategoryId: null,
          activeEmptyState: null,
          logicalRootPath: null,
          logicalRootLabel: null,
          browserHistory: [],
          errorMessage: null,
          isLoading: false,
        };
      }

      const browserHistory = state.browserHistory.slice(0, -1);
      const previousEntry = browserHistory.at(-1);

      if (!previousEntry) {
        return state;
      }

      return {
        ...createDirectoryState(previousEntry.path, previousEntry.context),
        browserHistory,
      };
    }),
  setCurrentPath: currentPath => set(createDirectoryState(currentPath)),
  setNodes: nodes => set({nodes}),
  setLoading: isLoading => set({isLoading}),
  setErrorMessage: errorMessage => set({errorMessage}),
  toggleSelection: nodeId =>
    set(state => ({
      selectedNodeIds: state.selectedNodeIds.includes(nodeId)
        ? state.selectedNodeIds.filter(id => id !== nodeId)
        : [...state.selectedNodeIds, nodeId],
    })),
  clearSelection: () => set({selectedNodeIds: []}),
  setClipboard: clipboard => set({clipboard}),
  requestReload: () =>
    set(state => ({
      reloadVersion: state.reloadVersion + 1,
      isLoading: true,
      errorMessage: null,
    })),
  recordRecentNode: node =>
    set(state => {
      const withoutCurrent = state.recentOpenedNodes.filter(
        currentNode => currentNode.path !== node.path,
      );

      return {
        recentOpenedNodes: [
          {
            ...node,
            isRecent: true,
          },
          ...withoutCurrent,
        ].slice(0, 10),
      };
    }),
  removeRecentNode: path =>
    set(state => ({
      recentOpenedNodes: state.recentOpenedNodes.filter(
        currentNode => currentNode.path !== path,
      ),
    })),
  clearRecentNodes: () => set({recentOpenedNodes: []}),
}));

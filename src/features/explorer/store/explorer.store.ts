import {create} from 'zustand';

import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import type {
  ExplorerCategoryId,
  ExplorerDirectoryContext,
  ExplorerEmptyStateConfig,
  ExplorerMode,
  ExplorerPlaceholderView,
} from '@/features/explorer/types/explorer.types';
import {getParentPath} from '@/utils/path';

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
  recentOpenedNodes: FileSystemNode[];
  // Deprecated: operation clipboard state is now managed by OperationClipboardService.
  clipboard: ClipboardState | null;
  isLoading: boolean;
  reloadVersion: number;
  errorMessage: string | null;
  openHome: () => void;
  openBrowser: (path: string, context?: ExplorerDirectoryContext | null) => void;
  openPlaceholder: (placeholderView: ExplorerPlaceholderView) => void;
  openPreview: (node: FileSystemNode) => void;
  setCurrentPath: (path: string) => void;
  setNodes: (nodes: FileSystemNode[]) => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  toggleSelection: (nodeId: string) => void;
  clearSelection: () => void;
  setClipboard: (clipboard: ClipboardState | null) => void;
  requestReload: () => void;
  recordRecentNode: (node: FileSystemNode) => void;
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
      errorMessage: null,
      isLoading: false,
    }),
  openBrowser: (currentPath, context) => set(createDirectoryState(currentPath, context)),
  openPlaceholder: placeholderView =>
    set(state => ({
      mode: 'placeholder',
      placeholderView,
      previewNode: null,
      selectedNodeIds: [],
      activeDirectoryCategoryId: state.activeDirectoryCategoryId,
      activeEmptyState: state.activeEmptyState,
      errorMessage: null,
      isLoading: false,
    })),
  openPreview: previewNode =>
    set(state => ({
      mode: 'preview',
      currentPath:
        previewNode.kind === 'file'
          ? getParentPath(previewNode.path)
          : state.currentPath,
      previewNode,
      placeholderView: null,
      selectedNodeIds: [],
      activeDirectoryCategoryId: state.activeDirectoryCategoryId,
      activeEmptyState: state.activeEmptyState,
      errorMessage: null,
      isLoading: false,
    })),
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
}));

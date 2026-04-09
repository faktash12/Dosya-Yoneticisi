import {create} from 'zustand';

import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

interface ClipboardState {
  mode: 'copy' | 'cut';
  nodeIds: string[];
}

interface ExplorerState {
  currentPath: string;
  nodes: FileSystemNode[];
  selectedNodeIds: string[];
  // Deprecated: operation clipboard state is now managed by OperationClipboardService.
  clipboard: ClipboardState | null;
  isLoading: boolean;
  errorMessage: string | null;
  setCurrentPath: (path: string) => void;
  setNodes: (nodes: FileSystemNode[]) => void;
  setLoading: (isLoading: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  toggleSelection: (nodeId: string) => void;
  clearSelection: () => void;
  setClipboard: (clipboard: ClipboardState | null) => void;
}

export const useExplorerStore = create<ExplorerState>(set => ({
  currentPath: ROOT_DIRECTORY,
  nodes: [],
  selectedNodeIds: [],
  clipboard: null,
  isLoading: false,
  errorMessage: null,
  setCurrentPath: currentPath => set({currentPath}),
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
}));

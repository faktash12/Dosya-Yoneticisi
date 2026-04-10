import {Alert} from 'react-native';
import {useCallback, useEffect, useEffectEvent, useMemo, useRef} from 'react';

import {appContainer} from '@/app/di/container';
import {useUiStore} from '@/app/store/ui.store';
import {DirectoryNotFoundError} from '@/data/datasources/MockFileSystemDataSource';
import {ROOT_DIRECTORY, TRASH_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useExplorerStore} from '@/features/explorer/store/explorer.store';
import type {
  ExplorerDirectoryContext,
  ExplorerPlaceholderView,
} from '@/features/explorer/types/explorer.types';
import {getFileOpenMode} from '@/features/explorer/utils/fileOpenSupport';
import {resolveExplorerCategoryAction} from '@/features/explorer/view-models/explorerCategoryActionResolver';
import {mapUnknownError} from '@/services/error/ErrorMapper';
import {appDiagnostics} from '@/services/logging/AppDiagnostics';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';
import {getParentPath, getPathLabel} from '@/utils/path';

export const useExplorerController = () => {
  const mode = useExplorerStore(state => state.mode);
  const currentPath = useExplorerStore(state => state.currentPath);
  const placeholderView = useExplorerStore(state => state.placeholderView);
  const previewNode = useExplorerStore(state => state.previewNode);
  const nodes = useExplorerStore(state => state.nodes);
  const recentOpenedNodes = useExplorerStore(state => state.recentOpenedNodes);
  const selectedNodeIds = useExplorerStore(state => state.selectedNodeIds);
  const isLoading = useExplorerStore(state => state.isLoading);
  const errorMessage = useExplorerStore(state => state.errorMessage);
  const reloadVersion = useExplorerStore(state => state.reloadVersion);
  const activeDirectoryCategoryId = useExplorerStore(
    state => state.activeDirectoryCategoryId,
  );
  const activeEmptyState = useExplorerStore(state => state.activeEmptyState);
  const showHiddenFiles = useUiStore(state => state.showHiddenFiles);
  const setNodes = useExplorerStore(state => state.setNodes);
  const setLoading = useExplorerStore(state => state.setLoading);
  const setErrorMessage = useExplorerStore(state => state.setErrorMessage);
  const toggleSelection = useExplorerStore(state => state.toggleSelection);
  const clearSelection = useExplorerStore(state => state.clearSelection);
  const openHome = useExplorerStore(state => state.openHome);
  const openBrowser = useExplorerStore(state => state.openBrowser);
  const openPlaceholder = useExplorerStore(state => state.openPlaceholder);
  const openPreview = useExplorerStore(state => state.openPreview);
  const requestReload = useExplorerStore(state => state.requestReload);
  const recordRecentNode = useExplorerStore(state => state.recordRecentNode);

  const loadRequestIdRef = useRef(0);

  const handleLoadError = useEffectEvent((error: unknown) => {
    setNodes([]);

    if (error instanceof DirectoryNotFoundError) {
      setErrorMessage(error.message);
      appContainer.logger.warn({
        scope: 'Explorer',
        message: 'Directory path was not found in data source',
        data: {path: error.message},
      });
      return;
    }

    const mappedError = mapUnknownError(error);
    setErrorMessage(mappedError.message);
    appContainer.logger.error({
      scope: 'Explorer',
      message: 'Directory load failed',
      data: mappedError,
    });
  });

  useEffect(() => {
    loadRequestIdRef.current += 1;
    const requestId = loadRequestIdRef.current;

    if (mode !== 'browser') {
      setLoading(false);
      setErrorMessage(null);
      return;
    }

    const loadDirectory = async () => {
      const startedAt = Date.now();

      try {
        setLoading(true);
        setErrorMessage(null);
        if (currentPath === TRASH_DIRECTORY) {
          await localFileSystemBridge.createDirectory(TRASH_DIRECTORY);
        }
        void appDiagnostics.recordBreadcrumb('Explorer', 'Directory load started', {
          path: currentPath,
        });

        const result = await appContainer.browseDirectoryUseCase.execute({
          path: currentPath,
          providerId: 'local',
        });
        const visibleNodes = showHiddenFiles
          ? result
          : result.filter(node => !node.name.startsWith('.'));

        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        setNodes(visibleNodes);
        void appDiagnostics.recordBreadcrumb(
          'Explorer',
          'Directory load completed',
          {
            path: currentPath,
            nodeCount: visibleNodes.length,
            durationMs: Date.now() - startedAt,
          },
        );
      } catch (error) {
        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        void appDiagnostics.recordError('Explorer', error, {
          path: currentPath,
          durationMs: Date.now() - startedAt,
        });
        handleLoadError(error);
      } finally {
        if (loadRequestIdRef.current === requestId) {
          setLoading(false);
        }
      }
    };

    void loadDirectory();
  }, [
    currentPath,
    handleLoadError,
    mode,
    reloadVersion,
    setErrorMessage,
    setLoading,
    setNodes,
    showHiddenFiles,
  ]);

  const openNode = useCallback(
    async (node: FileSystemNode) => {
      void appDiagnostics.recordBreadcrumb('Explorer', 'Open node requested', {
        nodeId: node.id,
        path: node.path,
        kind: node.kind,
      });

      if (node.kind === 'directory') {
        clearSelection();
        openBrowser(node.path);
        return;
      }

      const fileOpenMode = getFileOpenMode(node);
      recordRecentNode(node);

      try {
        if (
          fileOpenMode === 'text-preview' ||
          fileOpenMode === 'html-preview' ||
          fileOpenMode === 'image-preview'
        ) {
          clearSelection();
          openPreview(node);
          return;
        }

        await localFileSystemBridge.openFile(node.path);
        void appDiagnostics.recordBreadcrumb(
          'Explorer',
          'Opened file with external viewer',
          {
            nodeId: node.id,
            path: node.path,
          },
        );
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `${node.name} için önizleme henüz eklenmedi.`;

        Alert.alert('Önizleme hazır değil', message);
        void appDiagnostics.recordError('Explorer', error, {
          path: node.path,
          nodeId: node.id,
        });
      }
    },
    [clearSelection, openBrowser, openPreview, recordRecentNode],
  );

  const goBack = useCallback(() => {
    void appDiagnostics.recordBreadcrumb('Explorer', 'Go back requested', {
      mode,
      currentPath,
    });

    if (mode === 'placeholder') {
      openHome();
      return;
    }

    if (mode === 'preview') {
      clearSelection();
      openBrowser(currentPath, {
        categoryId: activeDirectoryCategoryId,
        emptyState: activeEmptyState,
      });
      return;
    }

    if (mode !== 'browser') {
      return;
    }

    const categoryRootPath =
      activeDirectoryCategoryId != null
        ? (() => {
            const action = resolveExplorerCategoryAction(activeDirectoryCategoryId);
            return action.kind === 'directory' ? action.path : null;
          })()
        : null;

    if (currentPath === ROOT_DIRECTORY) {
      openHome();
      return;
    }

    if (categoryRootPath != null && currentPath === categoryRootPath) {
      openHome();
      return;
    }

    clearSelection();
    openBrowser(getParentPath(currentPath));
  }, [
    clearSelection,
    currentPath,
    mode,
    openBrowser,
    openHome,
    activeDirectoryCategoryId,
    activeEmptyState,
  ]);

  const handleToggleSelection = useCallback(
    (node: FileSystemNode) => toggleSelection(node.id),
    [toggleSelection],
  );

  const openBrowserPath = useCallback(
    (path: string, context?: ExplorerDirectoryContext | null) => {
      void appDiagnostics.recordBreadcrumb(
        'Explorer',
        'Open directory path requested',
        {
          path,
          categoryId: context?.categoryId ?? 'none',
        },
      );
      clearSelection();
      openBrowser(path, context);
    },
    [clearSelection, openBrowser],
  );

  const openPlaceholderView = useCallback(
    (nextPlaceholderView: ExplorerPlaceholderView) => {
      void appDiagnostics.recordBreadcrumb('Explorer', 'Open placeholder requested', {
        placeholderId: nextPlaceholderView.id,
        title: nextPlaceholderView.title,
        kind: nextPlaceholderView.kind,
      });
      clearSelection();
      openPlaceholder(nextPlaceholderView);
    },
    [clearSelection, openPlaceholder],
  );

  return useMemo(
    () => ({
      mode,
      currentPath,
      currentPathLabel: getPathLabel(currentPath),
      placeholderView,
      nodes,
      isLoading,
      errorMessage,
      selectedNodeIds,
      activeDirectoryCategoryId,
      activeEmptyState,
      previewNode,
      recentOpenedNodes,
      canGoBack: mode !== 'home',
      openHome,
      openBrowserPath,
      openPlaceholderView,
      openNode,
      goBack,
      requestReload,
      recordRecentNode,
      toggleSelection: handleToggleSelection,
      clearSelection,
    }),
    [
      activeDirectoryCategoryId,
      activeEmptyState,
      clearSelection,
      currentPath,
      errorMessage,
      goBack,
      handleToggleSelection,
      isLoading,
      mode,
      nodes,
      openBrowserPath,
      openHome,
      openNode,
      openPlaceholderView,
      placeholderView,
      previewNode,
      recentOpenedNodes,
      recordRecentNode,
      requestReload,
      selectedNodeIds,
    ],
  );
};

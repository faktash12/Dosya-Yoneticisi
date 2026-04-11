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
import {filterNodesForCategory} from '@/features/explorer/utils/mediaClassification';
import {mapUnknownError} from '@/services/error/ErrorMapper';
import {appDiagnostics} from '@/services/logging/AppDiagnostics';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';
import {getPathLabel} from '@/utils/path';

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
  const logicalRootPath = useExplorerStore(state => state.logicalRootPath);
  const logicalRootLabel = useExplorerStore(state => state.logicalRootLabel);
  const browserHistory = useExplorerStore(state => state.browserHistory);
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
  const restorePreviousBrowser = useExplorerStore(
    state => state.restorePreviousBrowser,
  );
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

        let result;
        if (activeDirectoryCategoryId === 'documents') {
          result = await localFileSystemBridge.listFilesByCategory(
            'documents',
            showHiddenFiles,
            0,
          );
        } else if (activeDirectoryCategoryId === 'recent') {
          result = await localFileSystemBridge.listRecentFiles(
            300,
            showHiddenFiles,
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          );
        } else if (
          activeDirectoryCategoryId === 'images' &&
          currentPath === ROOT_DIRECTORY
        ) {
          const folders = await localFileSystemBridge.listKnownMediaFolders(
            'images',
            showHiddenFiles,
          );
          result =
            folders.length > 0
              ? folders
              : await localFileSystemBridge.listFilesByCategory(
                  'images',
                  showHiddenFiles,
                  100,
                );
        } else if (
          activeDirectoryCategoryId === 'video' &&
          currentPath === ROOT_DIRECTORY
        ) {
          const folders = await localFileSystemBridge.listKnownMediaFolders(
            'video',
            showHiddenFiles,
          );
          result =
            folders.length > 0
              ? folders
              : await localFileSystemBridge.listFilesByCategory(
                  'video',
                  showHiddenFiles,
                  100,
                );
        } else if (
          activeDirectoryCategoryId === 'audio' &&
          currentPath === ROOT_DIRECTORY
        ) {
          const folders = await localFileSystemBridge.listKnownMediaFolders(
            'audio',
            showHiddenFiles,
          );
          result =
            folders.length > 0
              ? folders
              : await localFileSystemBridge.listFilesByCategory(
                  'audio',
                  showHiddenFiles,
                  100,
                );
        } else {
          result = await appContainer.browseDirectoryUseCase.execute({
            path: currentPath,
            providerId: 'local',
          });
        }
        const visibleNodes = showHiddenFiles
          ? result
          : result.filter(node => !node.name.startsWith('.'));
        const categoryFilteredNodes = filterNodesForCategory(
          visibleNodes,
          activeDirectoryCategoryId,
        );

        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        setNodes(categoryFilteredNodes);
        void appDiagnostics.recordBreadcrumb(
          'Explorer',
          'Directory load completed',
          {
            path: currentPath,
            nodeCount: categoryFilteredNodes.length,
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
    activeDirectoryCategoryId,
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
        openBrowser(node.path, {
          categoryId: activeDirectoryCategoryId,
          emptyState: activeEmptyState,
          logicalRootPath,
          logicalRootLabel,
        });
        return;
      }

      const fileOpenMode = getFileOpenMode(node);
      recordRecentNode(node);

      try {
        if (node.extension?.toLowerCase() === 'apk') {
          await localFileSystemBridge.installPackage(node.path);
          clearSelection();
          return;
        }

        if (fileOpenMode === 'video-preview') {
          await localFileSystemBridge.openVideoPlayer(node.path);
          clearSelection();
          return;
        }

        if (
          fileOpenMode === 'text-preview' ||
          fileOpenMode === 'html-preview' ||
          fileOpenMode === 'image-preview' ||
          fileOpenMode === 'audio-preview'
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
    [
      activeDirectoryCategoryId,
      activeEmptyState,
      clearSelection,
      logicalRootLabel,
      logicalRootPath,
      openBrowser,
      openPreview,
      recordRecentNode,
    ],
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
        logicalRootPath,
        logicalRootLabel,
      });
      return;
    }

    if (mode !== 'browser') {
      return;
    }

    if (browserHistory.length > 1) {
      clearSelection();
      restorePreviousBrowser();
      return;
    }

    clearSelection();
    openHome();
  }, [
    activeDirectoryCategoryId,
    clearSelection,
    currentPath,
    mode,
    openBrowser,
    openHome,
    activeEmptyState,
    browserHistory.length,
    logicalRootLabel,
    logicalRootPath,
    restorePreviousBrowser,
  ]);

  const handleToggleSelection = useCallback(
    (node: FileSystemNode) => toggleSelection(node.id),
    [toggleSelection],
  );

  const openBrowserPath = useCallback(
    (
      path: string,
      context?: ExplorerDirectoryContext | null,
      options?: {resetHistory?: boolean},
    ) => {
      void appDiagnostics.recordBreadcrumb(
        'Explorer',
        'Open directory path requested',
        {
          path,
          categoryId: context?.categoryId ?? 'none',
        },
      );
      clearSelection();
      openBrowser(path, context, options);
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
      logicalRootPath,
      logicalRootLabel,
      browserHistory,
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
      browserHistory,
      clearSelection,
      currentPath,
      errorMessage,
      goBack,
      handleToggleSelection,
      isLoading,
      mode,
      nodes,
      logicalRootLabel,
      logicalRootPath,
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

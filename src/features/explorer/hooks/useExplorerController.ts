import {Alert} from 'react-native';
import {useCallback, useEffect, useEffectEvent, useMemo, useRef} from 'react';

import {appContainer} from '@/app/di/container';
import {DirectoryNotFoundError} from '@/data/datasources/MockFileSystemDataSource';
import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useExplorerStore} from '@/features/explorer/store/explorer.store';
import type {
  ExplorerDirectoryContext,
  ExplorerPlaceholderView,
} from '@/features/explorer/types/explorer.types';
import {mapUnknownError} from '@/services/error/ErrorMapper';
import {appDiagnostics} from '@/services/logging/AppDiagnostics';
import {getParentPath, getPathLabel} from '@/utils/path';

export const useExplorerController = () => {
  const mode = useExplorerStore(state => state.mode);
  const currentPath = useExplorerStore(state => state.currentPath);
  const placeholderView = useExplorerStore(state => state.placeholderView);
  const nodes = useExplorerStore(state => state.nodes);
  const selectedNodeIds = useExplorerStore(state => state.selectedNodeIds);
  const isLoading = useExplorerStore(state => state.isLoading);
  const errorMessage = useExplorerStore(state => state.errorMessage);
  const activeDirectoryCategoryId = useExplorerStore(
    state => state.activeDirectoryCategoryId,
  );
  const activeEmptyState = useExplorerStore(state => state.activeEmptyState);
  const setNodes = useExplorerStore(state => state.setNodes);
  const setLoading = useExplorerStore(state => state.setLoading);
  const setErrorMessage = useExplorerStore(state => state.setErrorMessage);
  const toggleSelection = useExplorerStore(state => state.toggleSelection);
  const clearSelection = useExplorerStore(state => state.clearSelection);
  const openHome = useExplorerStore(state => state.openHome);
  const openBrowser = useExplorerStore(state => state.openBrowser);
  const openPlaceholder = useExplorerStore(state => state.openPlaceholder);

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
        void appDiagnostics.recordBreadcrumb('Explorer', 'Directory load started', {
          path: currentPath,
        });

        const result = await appContainer.browseDirectoryUseCase.execute({
          path: currentPath,
          providerId: 'local',
        });

        if (loadRequestIdRef.current !== requestId) {
          return;
        }

        setNodes(result);
        void appDiagnostics.recordBreadcrumb(
          'Explorer',
          'Directory load completed',
          {
            path: currentPath,
            nodeCount: result.length,
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
  }, [currentPath, handleLoadError, mode, setErrorMessage, setLoading, setNodes]);

  const openNode = useCallback(
    (node: FileSystemNode) => {
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

      Alert.alert(
        'Önizleme hazır değil',
        `${node.name} için önizleme henüz eklenmedi.`,
      );

      void appDiagnostics.recordBreadcrumb('Explorer', 'File preview alert shown', {
        nodeId: node.id,
        path: node.path,
      });

      appContainer.logger.info({
        scope: 'Explorer',
        message: 'Preview is not implemented yet',
        data: {nodeId: node.id, path: node.path},
      });
    },
    [clearSelection, openBrowser],
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

    if (mode !== 'browser') {
      return;
    }

    if (currentPath === ROOT_DIRECTORY) {
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
      canGoBack: mode !== 'home',
      openHome,
      openBrowserPath,
      openPlaceholderView,
      openNode,
      goBack,
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
      selectedNodeIds,
    ],
  );
};

import {useCallback, useEffect, useEffectEvent, useMemo} from 'react';

import {appContainer} from '@/app/di/container';
import {DirectoryNotFoundError} from '@/data/datasources/MockFileSystemDataSource';
import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useExplorerStore} from '@/features/explorer/store/explorer.store';
import type {
  ExplorerDirectoryContext,
  ExplorerPlaceholderView,
} from '@/features/explorer/types/explorer.types';
import {createUnsupportedCategoryPlaceholder} from '@/features/explorer/view-models/explorerCategoryActionResolver';
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
  const openDashboard = useExplorerStore(state => state.openDashboard);
  const openDirectory = useExplorerStore(state => state.openDirectory);
  const openPlaceholder = useExplorerStore(state => state.openPlaceholder);

  const handleLoadError = useEffectEvent((error: unknown) => {
    setNodes([]);

    if (error instanceof DirectoryNotFoundError) {
      setErrorMessage(null);
      openPlaceholder(
        createUnsupportedCategoryPlaceholder(
          'Kaynak açılamadı',
          `${error.message}. Explorer güvenli placeholder ile devam ediyor.`,
        ),
      );
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
    if (mode !== 'directory') {
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
        void appDiagnostics.recordError('Explorer', error, {
          path: currentPath,
          durationMs: Date.now() - startedAt,
        });
        handleLoadError(error);
      } finally {
        setLoading(false);
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
        openDirectory(node.path);
        return;
      }

      openPlaceholder({
        id: `file-preview-${node.id}`,
        kind: 'file-preview',
        title: node.name,
        description:
          'Dosya önizleme ve açma akışı bu sürümde güvenli placeholder olarak bırakıldı.',
        supportingLines: [
          `Dosya yolu: ${node.path}`,
          'Liste ve gezinme akışı çalışmaya devam eder.',
        ],
        ctaLabel: 'Klasöre geri dön',
      });

      appContainer.logger.info({
        scope: 'Explorer',
        message: 'Preview is not implemented yet',
        data: {nodeId: node.id, path: node.path},
      });
    },
    [clearSelection, openDirectory, openPlaceholder],
  );

  const goBack = useCallback(() => {
    void appDiagnostics.recordBreadcrumb('Explorer', 'Go back requested', {
      mode,
      currentPath,
    });

    if (mode === 'placeholder') {
      if (placeholderView?.kind === 'file-preview') {
        openDirectory(currentPath, {
          categoryId: activeDirectoryCategoryId,
          emptyState: activeEmptyState,
        });
        return;
      }

      openDashboard();
      return;
    }

    if (mode !== 'directory') {
      return;
    }

    if (currentPath === ROOT_DIRECTORY) {
      openDashboard();
      return;
    }

    clearSelection();
    openDirectory(getParentPath(currentPath));
  }, [
    activeDirectoryCategoryId,
    activeEmptyState,
    clearSelection,
    currentPath,
    mode,
    openDashboard,
    openDirectory,
    placeholderView?.kind,
  ]);

  const handleToggleSelection = useCallback(
    (node: FileSystemNode) => toggleSelection(node.id),
    [toggleSelection],
  );

  const openDirectoryPath = useCallback(
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
      openDirectory(path, context);
    },
    [clearSelection, openDirectory],
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
      canGoBack: mode !== 'dashboard',
      openDashboard,
      openDirectoryPath,
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
      openDashboard,
      openDirectoryPath,
      openNode,
      openPlaceholderView,
      placeholderView,
      selectedNodeIds,
    ],
  );
};

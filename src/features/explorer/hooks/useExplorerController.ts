import {
  startTransition,
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
} from 'react';

import {appContainer} from '@/app/di/container';
import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {useExplorerStore} from '@/features/explorer/store/explorer.store';
import {mapUnknownError} from '@/services/error/ErrorMapper';
import {appDiagnostics} from '@/services/logging/AppDiagnostics';
import {getParentPath, getPathLabel} from '@/utils/path';

export const useExplorerController = () => {
  const currentPath = useExplorerStore(state => state.currentPath);
  const nodes = useExplorerStore(state => state.nodes);
  const selectedNodeIds = useExplorerStore(state => state.selectedNodeIds);
  const isLoading = useExplorerStore(state => state.isLoading);
  const errorMessage = useExplorerStore(state => state.errorMessage);
  const setCurrentPath = useExplorerStore(state => state.setCurrentPath);
  const setNodes = useExplorerStore(state => state.setNodes);
  const setLoading = useExplorerStore(state => state.setLoading);
  const setErrorMessage = useExplorerStore(state => state.setErrorMessage);
  const toggleSelection = useExplorerStore(state => state.toggleSelection);
  const clearSelection = useExplorerStore(state => state.clearSelection);

  const handleLoadError = useEffectEvent((error: unknown) => {
    const mappedError = mapUnknownError(error);
    setErrorMessage(mappedError.message);
    appContainer.logger.error({
      scope: 'Explorer',
      message: 'Directory load failed',
      data: mappedError,
    });
  });

  useEffect(() => {
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
  }, [currentPath, handleLoadError, setErrorMessage, setLoading, setNodes]);

  const openNode = useCallback(
    (node: FileSystemNode) => {
      if (node.kind === 'directory') {
        clearSelection();
        startTransition(() => {
          setCurrentPath(node.path);
        });
        return;
      }

      appContainer.logger.info({
        scope: 'Explorer',
        message: 'Preview is not implemented yet',
        data: {nodeId: node.id, path: node.path},
      });
    },
    [clearSelection, setCurrentPath],
  );

  const goBack = useCallback(() => {
    if (currentPath !== ROOT_DIRECTORY) {
      clearSelection();
      startTransition(() => {
        setCurrentPath(getParentPath(currentPath));
      });
    }
  }, [clearSelection, currentPath, setCurrentPath]);

  const handleToggleSelection = useCallback(
    (node: FileSystemNode) => toggleSelection(node.id),
    [toggleSelection],
  );

  return useMemo(
    () => ({
      currentPath,
      currentPathLabel: getPathLabel(currentPath),
      nodes,
      isLoading,
      errorMessage,
      selectedNodeIds,
      canGoBack: currentPath !== ROOT_DIRECTORY,
      openNode,
      goBack,
      toggleSelection: handleToggleSelection,
      clearSelection,
    }),
    [
      clearSelection,
      currentPath,
      errorMessage,
      goBack,
      handleToggleSelection,
      isLoading,
      nodes,
      openNode,
      selectedNodeIds,
    ],
  );
};

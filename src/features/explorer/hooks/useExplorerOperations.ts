import {useSyncExternalStore} from 'react';

import {appContainer} from '@/app/di/container';
import {useExplorerStore} from '@/features/explorer/store/explorer.store';
import {
  getSelectedOperationTargets,
  mapDirectoryPathToOperationTargetRef,
} from '@/features/explorer/integrations/explorerOperationActions';

export const useExplorerOperations = () => {
  const currentPath = useExplorerStore(state => state.currentPath);
  const nodes = useExplorerStore(state => state.nodes);
  const selectedNodeIds = useExplorerStore(state => state.selectedNodeIds);

  const clipboard = useSyncExternalStore(
    listener => appContainer.operationClipboardService.subscribe(listener),
    () => appContainer.operationClipboardService.getSnapshot(),
  );

  const getSelectedTargets = () =>
    getSelectedOperationTargets(nodes, selectedNodeIds);

  return {
    clipboard,
    copySelection: () => {
      const selectedTargets = getSelectedTargets();

      if (selectedTargets.length === 0) {
        return;
      }

      appContainer.operationClipboardService.setCopyBuffer(
        selectedTargets,
        currentPath,
        'local',
      );
    },
    cutSelection: () => {
      const selectedTargets = getSelectedTargets();

      if (selectedTargets.length === 0) {
        return;
      }

      appContainer.operationClipboardService.setCutBuffer(
        selectedTargets,
        currentPath,
        'local',
      );
    },
    pasteIntoCurrentFolder: async () => {
      return appContainer.commitClipboardPasteUseCase.execute({
        destination: mapDirectoryPathToOperationTargetRef(currentPath),
      });
    },
    clearClipboard: () => appContainer.operationClipboardService.clear(),
  };
};

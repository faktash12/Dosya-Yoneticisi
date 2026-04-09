import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import type {OperationTargetRef} from '@/domain/entities/OperationJob';
import {getPathLabel} from '@/utils/path';

const getEntryDisplayNameFromPath = (path: string): string => {
  if (path === ROOT_DIRECTORY) {
    return 'Dahili Depolama';
  }

  const segments = path.split('/').filter(Boolean);
  return segments.at(-1) ?? getPathLabel(path);
};

export const mapNodeToOperationTargetRef = (
  node: FileSystemNode,
): OperationTargetRef => {
  const target: OperationTargetRef = {
    providerId: node.providerId,
    entryId: node.id,
    displayName: node.name,
    path: node.path,
    entryType: node.kind,
  };

  if (typeof node.sizeBytes === 'number') {
    target.sizeBytes = node.sizeBytes;
  }

  return target;
};

export const mapDirectoryPathToOperationTargetRef = (
  path: string,
): OperationTargetRef => ({
  providerId: 'local',
  entryId: path,
  displayName: getEntryDisplayNameFromPath(path),
  path,
  entryType: 'directory',
});

export const getSelectedOperationTargets = (
  nodes: FileSystemNode[],
  selectedNodeIds: string[],
): OperationTargetRef[] => {
  return nodes
    .filter(node => selectedNodeIds.includes(node.id))
    .map(mapNodeToOperationTargetRef);
};

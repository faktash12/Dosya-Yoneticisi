import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

const excludedRecentExtensions = new Set(['tmp']);

const normalizedExtensionOf = (node: FileSystemNode): string =>
  node.extension?.trim().toLocaleLowerCase('en-US') ?? '';

export const shouldIncludeRecentNode = (node: FileSystemNode): boolean => {
  if (node.kind !== 'file') {
    return false;
  }

  return !excludedRecentExtensions.has(normalizedExtensionOf(node));
};

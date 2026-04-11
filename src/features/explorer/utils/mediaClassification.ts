import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import type {ExplorerCategoryId} from '@/features/explorer/types/explorer.types';

export const imageExtensions = new Set([
  'img',
  'jpg',
  'jpeg',
  'png',
  'webp',
  'gif',
  'bmp',
  'heic',
]);

export const videoExtensions = new Set([
  'mp4',
  'mpeg',
  'mpg',
  'avi',
  'mkv',
  'mov',
  'webm',
  '3gp',
  'm4v',
]);

export const audioExtensions = new Set([
  'mp3',
  'wav',
  'm4a',
  'aac',
  'ogg',
  'flac',
  'opus',
  'amr',
]);

export const documentExtensions = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ods',
  'txt',
  'log',
  'md',
  'csv',
  'rtf',
  'odt',
  'odf',
  'ppt',
  'pptx',
]);

export const archiveExtensions = new Set(['zip', 'rar', '7z', 'tar', 'gz']);

const hasMimePrefix = (node: FileSystemNode, prefix: string) =>
  node.mimeType?.toLowerCase().startsWith(prefix) === true;

const extensionOf = (node: FileSystemNode) => node.extension?.toLowerCase() ?? '';

export const isImageNode = (node: FileSystemNode): boolean =>
  node.kind === 'file' &&
  (imageExtensions.has(extensionOf(node)) || hasMimePrefix(node, 'image/'));

export const isVideoNode = (node: FileSystemNode): boolean =>
  node.kind === 'file' &&
  (videoExtensions.has(extensionOf(node)) || hasMimePrefix(node, 'video/'));

export const isAudioNode = (node: FileSystemNode): boolean =>
  node.kind === 'file' &&
  (audioExtensions.has(extensionOf(node)) || hasMimePrefix(node, 'audio/'));

export const isDocumentNode = (node: FileSystemNode): boolean =>
  node.kind === 'file' &&
  (documentExtensions.has(extensionOf(node)) ||
    hasMimePrefix(node, 'text/') ||
    hasMimePrefix(node, 'application/pdf'));

export const isArchiveNode = (node: FileSystemNode): boolean =>
  node.kind === 'file' && archiveExtensions.has(extensionOf(node));

export const isApkNode = (node: FileSystemNode): boolean =>
  node.kind === 'file' && extensionOf(node) === 'apk';

export const matchesExplorerCategory = (
  node: FileSystemNode,
  categoryId: ExplorerCategoryId | null,
): boolean => {
  if (node.kind === 'directory' || categoryId == null) {
    return true;
  }

  switch (categoryId) {
    case 'images':
      return isImageNode(node);
    case 'video':
      return isVideoNode(node);
    case 'audio':
      return isAudioNode(node);
    case 'documents':
      return isDocumentNode(node);
    default:
      return true;
  }
};

export const filterNodesForCategory = (
  nodes: FileSystemNode[],
  categoryId: ExplorerCategoryId | null,
): FileSystemNode[] => nodes.filter(node => matchesExplorerCategory(node, categoryId));

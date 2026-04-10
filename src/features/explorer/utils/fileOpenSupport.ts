import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

export type FileOpenMode =
  | 'text-preview'
  | 'html-preview'
  | 'image-preview'
  | 'external';

const textExtensions = new Set(['txt', 'log', 'md', 'json', 'csv']);
const htmlExtensions = new Set(['html', 'htm']);
const imageExtensions = new Set(['img', 'jpg', 'jpeg', 'png', 'webp']);
const officeExtensions = new Set(['doc', 'docx', 'xls', 'xlsx']);

export const getFileOpenMode = (node: FileSystemNode): FileOpenMode => {
  const extension = node.extension?.toLowerCase();

  if (extension && textExtensions.has(extension)) {
    return 'text-preview';
  }

  if (extension && htmlExtensions.has(extension)) {
    return 'html-preview';
  }

  if (extension && imageExtensions.has(extension)) {
    return 'image-preview';
  }

  if (extension && officeExtensions.has(extension)) {
    return 'external';
  }

  if (node.mimeType?.startsWith('image/')) {
    return 'image-preview';
  }

  if (node.mimeType?.startsWith('text/')) {
    return 'text-preview';
  }

  return 'external';
};

export const isPreviewableInsideApp = (node: FileSystemNode): boolean => {
  const mode = getFileOpenMode(node);
  return mode !== 'external';
};

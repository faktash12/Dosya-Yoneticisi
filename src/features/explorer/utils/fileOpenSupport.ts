import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {
  audioExtensions,
  imageExtensions,
  videoExtensions,
} from '@/features/explorer/utils/mediaClassification';

export type FileOpenMode =
  | 'text-preview'
  | 'html-preview'
  | 'image-preview'
  | 'audio-preview'
  | 'video-preview'
  | 'external';

const textExtensions = new Set(['txt', 'log', 'md', 'json', 'csv']);
const htmlExtensions = new Set(['html', 'htm']);
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

  if (extension && audioExtensions.has(extension)) {
    return 'audio-preview';
  }

  if (extension && videoExtensions.has(extension)) {
    return 'video-preview';
  }

  if (extension && officeExtensions.has(extension)) {
    return 'external';
  }

  if (node.mimeType?.startsWith('image/')) {
    return 'image-preview';
  }

  if (node.mimeType?.startsWith('audio/')) {
    return 'audio-preview';
  }

  if (node.mimeType?.startsWith('video/')) {
    return 'video-preview';
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

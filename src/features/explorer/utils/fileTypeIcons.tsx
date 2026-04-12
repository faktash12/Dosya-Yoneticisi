import React from 'react';
import {
  Archive,
  File,
  FileAudio,
  FileImage,
  FileText,
  Folder,
  Package,
  Video,
} from 'lucide-react-native';

import type {FileSystemNode} from '@/domain/entities/FileSystemNode';
import {
  isApkNode,
  isArchiveNode,
  isAudioNode,
  isDocumentNode,
  isImageNode,
  isVideoNode,
} from '@/features/explorer/utils/mediaClassification';

interface NodeTypeIconOptions {
  size: number;
  directoryColor: string;
  fileColor: string;
}

export const renderNodeTypeIcon = (
  node: FileSystemNode,
  options: NodeTypeIconOptions,
): React.JSX.Element => {
  const {size, directoryColor, fileColor} = options;

  if (node.kind === 'directory') {
    return <Folder color={directoryColor} size={size} />;
  }

  if (isApkNode(node)) {
    return <Package color={fileColor} size={size} />;
  }

  if (isImageNode(node)) {
    return <FileImage color={fileColor} size={size} />;
  }

  if (isVideoNode(node)) {
    return <Video color={fileColor} size={size} />;
  }

  if (isAudioNode(node)) {
    return <FileAudio color={fileColor} size={size} />;
  }

  if (isDocumentNode(node)) {
    return <FileText color={fileColor} size={size} />;
  }

  if (isArchiveNode(node)) {
    return <Archive color={fileColor} size={size} />;
  }

  return <File color={fileColor} size={size} />;
};

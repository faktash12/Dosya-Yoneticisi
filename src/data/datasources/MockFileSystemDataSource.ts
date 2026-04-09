import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

const readWritePermissions = {
  canRead: true,
  canWrite: true,
  canDelete: true,
  canShare: true,
} as const;

const createNode = (node: FileSystemNode): FileSystemNode => node;

const tree: Record<string, FileSystemNode[]> = {
  [ROOT_DIRECTORY]: [
    createNode({
      id: 'downloads',
      name: 'Download',
      path: `${ROOT_DIRECTORY}/Download`,
      kind: 'directory',
      providerId: 'local',
      modifiedAt: '2026-04-08T11:20:00.000Z',
      childCount: 14,
      permissions: readWritePermissions,
    }),
    createNode({
      id: 'documents',
      name: 'Documents',
      path: `${ROOT_DIRECTORY}/Documents`,
      kind: 'directory',
      providerId: 'local',
      modifiedAt: '2026-04-07T17:42:00.000Z',
      childCount: 8,
      permissions: readWritePermissions,
      isFavorite: true,
    }),
    createNode({
      id: 'dcim',
      name: 'DCIM',
      path: `${ROOT_DIRECTORY}/DCIM`,
      kind: 'directory',
      providerId: 'local',
      modifiedAt: '2026-04-09T05:14:00.000Z',
      childCount: 132,
      permissions: readWritePermissions,
    }),
    createNode({
      id: 'music',
      name: 'Music',
      path: `${ROOT_DIRECTORY}/Music`,
      kind: 'directory',
      providerId: 'local',
      modifiedAt: '2026-04-02T08:25:00.000Z',
      childCount: 27,
      permissions: readWritePermissions,
    }),
    createNode({
      id: 'archive-zip',
      name: 'backup-2026-04.zip',
      path: `${ROOT_DIRECTORY}/backup-2026-04.zip`,
      kind: 'file',
      providerId: 'local',
      modifiedAt: '2026-04-01T20:15:00.000Z',
      sizeBytes: 845_000_000,
      extension: 'zip',
      mimeType: 'application/zip',
      permissions: readWritePermissions,
      isRecent: true,
    }),
  ],
  [`${ROOT_DIRECTORY}/Download`]: [
    createNode({
      id: 'download-apk',
      name: 'MyTool-release.apk',
      path: `${ROOT_DIRECTORY}/Download/MyTool-release.apk`,
      kind: 'file',
      providerId: 'local',
      modifiedAt: '2026-04-08T12:02:00.000Z',
      sizeBytes: 56_400_000,
      extension: 'apk',
      mimeType: 'application/vnd.android.package-archive',
      permissions: readWritePermissions,
      isRecent: true,
    }),
    createNode({
      id: 'download-pdf',
      name: 'tax-report.pdf',
      path: `${ROOT_DIRECTORY}/Download/tax-report.pdf`,
      kind: 'file',
      providerId: 'local',
      modifiedAt: '2026-04-04T09:31:00.000Z',
      sizeBytes: 8_200_000,
      extension: 'pdf',
      mimeType: 'application/pdf',
      permissions: readWritePermissions,
    }),
  ],
  [`${ROOT_DIRECTORY}/Documents`]: [
    createNode({
      id: 'proposal-docx',
      name: 'client-proposal.docx',
      path: `${ROOT_DIRECTORY}/Documents/client-proposal.docx`,
      kind: 'file',
      providerId: 'local',
      modifiedAt: '2026-04-06T16:30:00.000Z',
      sizeBytes: 1_400_000,
      extension: 'docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      permissions: readWritePermissions,
    }),
    createNode({
      id: 'invoices',
      name: 'Invoices',
      path: `${ROOT_DIRECTORY}/Documents/Invoices`,
      kind: 'directory',
      providerId: 'local',
      modifiedAt: '2026-03-28T10:00:00.000Z',
      childCount: 24,
      permissions: readWritePermissions,
      isFavorite: true,
    }),
  ],
  [`${ROOT_DIRECTORY}/DCIM`]: [
    createNode({
      id: 'camera',
      name: 'Camera',
      path: `${ROOT_DIRECTORY}/DCIM/Camera`,
      kind: 'directory',
      providerId: 'local',
      modifiedAt: '2026-04-09T05:14:00.000Z',
      childCount: 128,
      permissions: readWritePermissions,
    }),
  ],
  [`${ROOT_DIRECTORY}/Music`]: [
    createNode({
      id: 'playlist-mp3',
      name: 'focus-playlist.mp3',
      path: `${ROOT_DIRECTORY}/Music/focus-playlist.mp3`,
      kind: 'file',
      providerId: 'local',
      modifiedAt: '2026-03-19T14:12:00.000Z',
      sizeBytes: 11_700_000,
      extension: 'mp3',
      mimeType: 'audio/mpeg',
      permissions: readWritePermissions,
    }),
  ],
};

const flatten = Object.values(tree).flat();

const delay = async () => {
  await new Promise<void>(resolve => setTimeout(() => resolve(), 180));
};

export class MockFileSystemDataSource {
  async listDirectory(path: string): Promise<FileSystemNode[]> {
    await delay();
    return tree[path] ?? [];
  }

  async getFavorites(): Promise<FileSystemNode[]> {
    await delay();
    return flatten.filter(node => node.isFavorite);
  }

  async getRecent(): Promise<FileSystemNode[]> {
    await delay();
    return flatten.filter(node => node.isRecent);
  }

  async search(query: string): Promise<FileSystemNode[]> {
    await delay();
    const lowerQuery = query.trim().toLowerCase();
    return flatten.filter(node => node.name.toLowerCase().includes(lowerQuery));
  }
}

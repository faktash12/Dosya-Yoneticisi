import {ROOT_DIRECTORY} from '@/constants/app';
import type {FileSystemNode} from '@/domain/entities/FileSystemNode';

const readWritePermissions = {
  canRead: true,
  canWrite: true,
  canDelete: true,
  canShare: true,
} as const;

const createDirectory = (
  id: string,
  name: string,
  path: string,
  modifiedAt: string,
  childCount: number,
  options?: Partial<FileSystemNode>,
): FileSystemNode => ({
  id,
  name,
  path,
  kind: 'directory',
  providerId: 'local',
  modifiedAt,
  childCount,
  permissions: readWritePermissions,
  ...options,
});

const createFile = (
  id: string,
  name: string,
  path: string,
  modifiedAt: string,
  sizeBytes: number,
  extension: string,
  mimeType: string,
  options?: Partial<FileSystemNode>,
): FileSystemNode => ({
  id,
  name,
  path,
  kind: 'file',
  providerId: 'local',
  modifiedAt,
  sizeBytes,
  extension,
  mimeType,
  permissions: readWritePermissions,
  ...options,
});

export class DirectoryNotFoundError extends Error {
  constructor(path: string) {
    super(`Kaynak bulunamadi: ${path}`);
    this.name = 'DirectoryNotFoundError';
  }
}

const tree: Record<string, FileSystemNode[]> = {
  [ROOT_DIRECTORY]: [
    createDirectory(
      'downloads',
      'Download',
      `${ROOT_DIRECTORY}/Download`,
      '2026-04-08T11:20:00.000Z',
      3,
    ),
    createDirectory(
      'documents',
      'Documents',
      `${ROOT_DIRECTORY}/Documents`,
      '2026-04-07T17:42:00.000Z',
      3,
      {isFavorite: true},
    ),
    createDirectory(
      'pictures',
      'Pictures',
      `${ROOT_DIRECTORY}/Pictures`,
      '2026-04-09T05:14:00.000Z',
      3,
    ),
    createDirectory(
      'music',
      'Music',
      `${ROOT_DIRECTORY}/Music`,
      '2026-04-02T08:25:00.000Z',
      3,
    ),
    createDirectory(
      'movies',
      'Movies',
      `${ROOT_DIRECTORY}/Movies`,
      '2026-04-05T09:40:00.000Z',
      3,
    ),
    createDirectory(
      'recent',
      'Recent',
      `${ROOT_DIRECTORY}/Recent`,
      '2026-04-09T08:10:00.000Z',
      4,
    ),
    createFile(
      'backup-zip',
      'backup-2026-04.zip',
      `${ROOT_DIRECTORY}/backup-2026-04.zip`,
      '2026-04-01T20:15:00.000Z',
      845_000_000,
      'zip',
      'application/zip',
      {isRecent: true},
    ),
  ],
  [`${ROOT_DIRECTORY}/Download`]: [
    createFile(
      'download-apk',
      'MyTool-release.apk',
      `${ROOT_DIRECTORY}/Download/MyTool-release.apk`,
      '2026-04-08T12:02:00.000Z',
      56_400_000,
      'apk',
      'application/vnd.android.package-archive',
      {isRecent: true},
    ),
    createFile(
      'download-pdf',
      'tax-report.pdf',
      `${ROOT_DIRECTORY}/Download/tax-report.pdf`,
      '2026-04-04T09:31:00.000Z',
      8_200_000,
      'pdf',
      'application/pdf',
    ),
    createFile(
      'download-csv',
      'campaign-export.csv',
      `${ROOT_DIRECTORY}/Download/campaign-export.csv`,
      '2026-04-09T07:32:00.000Z',
      280_000,
      'csv',
      'text/csv',
      {isRecent: true},
    ),
  ],
  [`${ROOT_DIRECTORY}/Documents`]: [
    createFile(
      'proposal-docx',
      'client-proposal.docx',
      `${ROOT_DIRECTORY}/Documents/client-proposal.docx`,
      '2026-04-06T16:30:00.000Z',
      1_400_000,
      'docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ),
    createDirectory(
      'invoices',
      'Invoices',
      `${ROOT_DIRECTORY}/Documents/Invoices`,
      '2026-03-28T10:00:00.000Z',
      2,
      {isFavorite: true},
    ),
    createFile(
      'brief-md',
      'launch-brief.md',
      `${ROOT_DIRECTORY}/Documents/launch-brief.md`,
      '2026-04-09T06:12:00.000Z',
      22_000,
      'md',
      'text/markdown',
      {isRecent: true},
    ),
  ],
  [`${ROOT_DIRECTORY}/Documents/Invoices`]: [
    createFile(
      'invoice-march',
      'invoice-2026-03.pdf',
      `${ROOT_DIRECTORY}/Documents/Invoices/invoice-2026-03.pdf`,
      '2026-03-28T10:00:00.000Z',
      310_000,
      'pdf',
      'application/pdf',
    ),
    createFile(
      'invoice-april',
      'invoice-2026-04.pdf',
      `${ROOT_DIRECTORY}/Documents/Invoices/invoice-2026-04.pdf`,
      '2026-04-08T15:45:00.000Z',
      318_000,
      'pdf',
      'application/pdf',
      {isRecent: true},
    ),
  ],
  [`${ROOT_DIRECTORY}/Pictures`]: [
    createDirectory(
      'screenshots',
      'Screenshots',
      `${ROOT_DIRECTORY}/Pictures/Screenshots`,
      '2026-04-09T08:11:00.000Z',
      2,
    ),
    createFile(
      'product-shot',
      'workspace-shot.jpg',
      `${ROOT_DIRECTORY}/Pictures/workspace-shot.jpg`,
      '2026-04-09T05:42:00.000Z',
      5_400_000,
      'jpg',
      'image/jpeg',
      {isRecent: true},
    ),
    createFile(
      'cover-png',
      'cover-render.png',
      `${ROOT_DIRECTORY}/Pictures/cover-render.png`,
      '2026-04-08T20:18:00.000Z',
      4_800_000,
      'png',
      'image/png',
    ),
  ],
  [`${ROOT_DIRECTORY}/Pictures/Screenshots`]: [
    createFile(
      'screenshot-1',
      'Screenshot_2026_04_08_2211.png',
      `${ROOT_DIRECTORY}/Pictures/Screenshots/Screenshot_2026_04_08_2211.png`,
      '2026-04-08T22:11:00.000Z',
      2_900_000,
      'png',
      'image/png',
      {isRecent: true},
    ),
    createFile(
      'screenshot-2',
      'Screenshot_2026_04_09_0804.png',
      `${ROOT_DIRECTORY}/Pictures/Screenshots/Screenshot_2026_04_09_0804.png`,
      '2026-04-09T08:04:00.000Z',
      3_100_000,
      'png',
      'image/png',
      {isRecent: true},
    ),
  ],
  [`${ROOT_DIRECTORY}/Music`]: [
    createFile(
      'playlist-mp3',
      'focus-playlist.mp3',
      `${ROOT_DIRECTORY}/Music/focus-playlist.mp3`,
      '2026-03-19T14:12:00.000Z',
      11_700_000,
      'mp3',
      'audio/mpeg',
    ),
    createFile(
      'memo-wav',
      'voice-note.wav',
      `${ROOT_DIRECTORY}/Music/voice-note.wav`,
      '2026-04-09T07:50:00.000Z',
      5_600_000,
      'wav',
      'audio/wav',
      {isRecent: true},
    ),
    createFile(
      'ambient-flac',
      'ambient-loop.flac',
      `${ROOT_DIRECTORY}/Music/ambient-loop.flac`,
      '2026-04-01T19:22:00.000Z',
      25_400_000,
      'flac',
      'audio/flac',
    ),
  ],
  [`${ROOT_DIRECTORY}/Movies`]: [
    createFile(
      'launch-reel',
      'launch-reel.mp4',
      `${ROOT_DIRECTORY}/Movies/launch-reel.mp4`,
      '2026-04-07T18:31:00.000Z',
      148_000_000,
      'mp4',
      'video/mp4',
      {isRecent: true},
    ),
    createFile(
      'demo-cut',
      'product-demo.mkv',
      `${ROOT_DIRECTORY}/Movies/product-demo.mkv`,
      '2026-04-06T13:41:00.000Z',
      420_000_000,
      'mkv',
      'video/x-matroska',
    ),
    createDirectory(
      'archived-videos',
      'Archived',
      `${ROOT_DIRECTORY}/Movies/Archived`,
      '2026-03-10T09:05:00.000Z',
      0,
    ),
  ],
  [`${ROOT_DIRECTORY}/Movies/Archived`]: [],
  [`${ROOT_DIRECTORY}/Recent`]: [
    createFile(
      'recent-export',
      'campaign-export.csv',
      `${ROOT_DIRECTORY}/Recent/campaign-export.csv`,
      '2026-04-09T07:32:00.000Z',
      280_000,
      'csv',
      'text/csv',
    ),
    createFile(
      'recent-screen',
      'Screenshot_2026_04_09_0804.png',
      `${ROOT_DIRECTORY}/Recent/Screenshot_2026_04_09_0804.png`,
      '2026-04-09T08:04:00.000Z',
      3_100_000,
      'png',
      'image/png',
    ),
    createFile(
      'recent-note',
      'voice-note.wav',
      `${ROOT_DIRECTORY}/Recent/voice-note.wav`,
      '2026-04-09T07:50:00.000Z',
      5_600_000,
      'wav',
      'audio/wav',
    ),
    createFile(
      'recent-brief',
      'launch-brief.md',
      `${ROOT_DIRECTORY}/Recent/launch-brief.md`,
      '2026-04-09T06:12:00.000Z',
      22_000,
      'md',
      'text/markdown',
    ),
  ],
};

const cloneNodes = (nodes: FileSystemNode[]): FileSystemNode[] =>
  nodes.map(node => ({...node}));

const flatten = Object.values(tree).flatMap(cloneNodes);

export class MockFileSystemDataSource {
  async listDirectory(path: string): Promise<FileSystemNode[]> {
    const nodes = tree[path];

    if (!nodes) {
      throw new DirectoryNotFoundError(path);
    }

    return cloneNodes(nodes);
  }

  async getFavorites(): Promise<FileSystemNode[]> {
    return flatten.filter(node => node.isFavorite);
  }

  async getRecent(): Promise<FileSystemNode[]> {
    return flatten.filter(node => node.isRecent);
  }

  async search(query: string): Promise<FileSystemNode[]> {
    const lowerQuery = query.trim().toLowerCase();
    return flatten.filter(node => node.name.toLowerCase().includes(lowerQuery));
  }
}

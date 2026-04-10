import {NativeModules, Platform} from 'react-native';

interface NativeFilePermissions {
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  canShare: boolean;
}

interface NativeFileSystemNode {
  id: string;
  name: string;
  path: string;
  kind: 'file' | 'directory';
  providerId: 'local';
  modifiedAt: string;
  sizeBytes?: number;
  extension?: string;
  mimeType?: string;
  childCount?: number;
  permissions: NativeFilePermissions;
}

export interface InstalledApplicationInfo {
  packageName: string;
  label: string;
  sizeBytes: number;
  sourceDir: string;
  iconBase64?: string | null;
  isSystemApp: boolean;
}

export interface RemovableStorageDeviceInfo {
  path: string;
  label: string;
  kind: 'sd-card' | 'usb';
}

export interface MediaPlaybackStatus {
  isPlaying: boolean;
  durationMs: number;
  positionMs: number;
  path?: string | null;
}

export interface FtpServerStatus {
  address: string;
  username: string;
  password: string;
  isRunning: boolean;
}

interface LocalFileSystemModuleShape {
  getRootDirectory: () => Promise<string>;
  listDirectory: (path: string) => Promise<NativeFileSystemNode[]>;
  searchDirectory: (
    path: string,
    query: string,
    includeHidden: boolean,
  ) => Promise<NativeFileSystemNode[]>;
  readTextFile: (path: string) => Promise<string>;
  writeTextFile: (path: string, content: string) => Promise<boolean>;
  openFile: (path: string) => Promise<boolean>;
  installPackage: (path: string) => Promise<boolean>;
  shareFiles: (paths: string[]) => Promise<boolean>;
  openVideoPlayer: (path: string) => Promise<boolean>;
  createDirectory: (directoryPath: string) => Promise<string>;
  renameEntry: (sourcePath: string, nextName: string) => Promise<string>;
  createTextFile: (
    directoryPath: string,
    fileName: string,
    content: string,
  ) => Promise<string>;
  deleteEntry: (path: string) => Promise<boolean>;
  copyEntry: (
    sourcePath: string,
    destinationDirectoryPath: string,
    conflictStrategy: 'overwrite' | 'skip' | 'rename',
  ) => Promise<string>;
  moveEntry: (
    sourcePath: string,
    destinationDirectoryPath: string,
    conflictStrategy: 'overwrite' | 'skip' | 'rename',
  ) => Promise<string>;
  extractArchive: (
    archivePath: string,
    destinationDirectoryPath: string,
  ) => Promise<string>;
  getUsbRoots: () => Promise<string[]>;
  getRemovableStorageDevices?: () => Promise<RemovableStorageDeviceInfo[]>;
  listInstalledApps: (
    includeSystemApps: boolean,
  ) => Promise<InstalledApplicationInfo[]>;
  uninstallPackage: (packageName: string) => Promise<boolean>;
  exitApplication: () => Promise<boolean>;
  startMediaFile: (path: string) => Promise<MediaPlaybackStatus>;
  pauseMediaPlayback: () => Promise<MediaPlaybackStatus>;
  resumeMediaPlayback: () => Promise<MediaPlaybackStatus>;
  stopMediaPlayback: () => Promise<MediaPlaybackStatus>;
  seekMediaPlayback: (positionMs: number) => Promise<MediaPlaybackStatus>;
  getMediaPlaybackStatus: () => Promise<MediaPlaybackStatus>;
  startFtpServer: (includeHidden: boolean) => Promise<FtpServerStatus>;
  stopFtpServer: () => Promise<FtpServerStatus>;
  searchFilesByExtensions?: (
    path: string,
    extensions: string[],
    includeHidden: boolean,
  ) => Promise<NativeFileSystemNode[]>;
}

const nativeModule = NativeModules.LocalFileSystemModule as
  | LocalFileSystemModuleShape
  | undefined;

export class LocalFileSystemUnavailableError extends Error {
  constructor() {
    super('Gerçek yerel depolama modülü kullanılamıyor.');
    this.name = 'LocalFileSystemUnavailableError';
  }
}

export class LocalFileSystemPermissionError extends Error {
  constructor(message = 'Depolama erişim izni gerekli.') {
    super(message);
    this.name = 'LocalFileSystemPermissionError';
  }
}

const normalizeNode = (node: NativeFileSystemNode): NativeFileSystemNode => ({
  ...node,
  ...(node.extension != null ? {extension: node.extension} : {}),
  ...(node.mimeType != null ? {mimeType: node.mimeType} : {}),
});

export const localFileSystemBridge = {
  async getRootDirectory(): Promise<string> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.getRootDirectory();
  },

  async listDirectory(path: string): Promise<NativeFileSystemNode[]> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    try {
      const result = await nativeModule.listDirectory(path);
      return result.map(normalizeNode);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Depolama içeriği okunamadı.';

      if (message.includes('Depolama erişim izni gerekli')) {
        throw new LocalFileSystemPermissionError(message);
      }

      throw error;
    }
  },

  async readTextFile(path: string): Promise<string> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.readTextFile(path);
  },

  async searchDirectory(
    path: string,
    query: string,
    includeHidden = false,
  ): Promise<NativeFileSystemNode[]> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    try {
      const result = await nativeModule.searchDirectory(path, query, includeHidden);
      return result.map(normalizeNode);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Arama tamamlanamadı.';

      if (message.includes('Depolama erişim izni gerekli')) {
        throw new LocalFileSystemPermissionError(message);
      }

      throw error;
    }
  },

  async searchFilesByExtensions(
    path: string,
    extensions: string[],
    includeHidden = false,
  ): Promise<NativeFileSystemNode[]> {
    if (
      Platform.OS !== 'android' ||
      !nativeModule?.searchFilesByExtensions
    ) {
      const nodes = await this.searchDirectory(path, '.', includeHidden);
      const normalizedExtensions = new Set(
        extensions.map(extension => extension.toLowerCase()),
      );
      return nodes.filter(
        node =>
          node.kind === 'file' &&
          normalizedExtensions.has(node.extension?.toLowerCase() ?? ''),
      );
    }

    const result = await nativeModule.searchFilesByExtensions(
      path,
      extensions,
      includeHidden,
    );
    return result.map(normalizeNode);
  },

  async writeTextFile(path: string, content: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.writeTextFile(path, content);
  },

  async openFile(path: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.openFile(path);
  },

  async installPackage(path: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.installPackage(path);
  },

  async shareFiles(paths: string[]): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.shareFiles(paths);
  },

  async openVideoPlayer(path: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.openVideoPlayer(path);
  },

  async createDirectory(directoryPath: string): Promise<string> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.createDirectory(directoryPath);
  },

  async renameEntry(sourcePath: string, nextName: string): Promise<string> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.renameEntry(sourcePath, nextName);
  },

  async createTextFile(
    directoryPath: string,
    fileName: string,
    content: string,
  ): Promise<string> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.createTextFile(directoryPath, fileName, content);
  },

  async deleteEntry(path: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.deleteEntry(path);
  },

  async copyEntry(
    sourcePath: string,
    destinationDirectoryPath: string,
    conflictStrategy: 'overwrite' | 'skip' | 'rename' = 'rename',
  ): Promise<string> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.copyEntry(
      sourcePath,
      destinationDirectoryPath,
      conflictStrategy,
    );
  },

  async moveEntry(
    sourcePath: string,
    destinationDirectoryPath: string,
    conflictStrategy: 'overwrite' | 'skip' | 'rename' = 'rename',
  ): Promise<string> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.moveEntry(
      sourcePath,
      destinationDirectoryPath,
      conflictStrategy,
    );
  },

  async extractArchive(
    archivePath: string,
    destinationDirectoryPath: string,
  ): Promise<string> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.extractArchive(archivePath, destinationDirectoryPath);
  },

  async getUsbRoots(): Promise<string[]> {
    if (Platform.OS !== 'android' || !nativeModule) {
      return [];
    }

    return nativeModule.getUsbRoots();
  },

  async getRemovableStorageDevices(): Promise<RemovableStorageDeviceInfo[]> {
    if (Platform.OS !== 'android' || !nativeModule?.getRemovableStorageDevices) {
      return [];
    }

    return nativeModule.getRemovableStorageDevices();
  },

  async listInstalledApps(
    includeSystemApps = false,
  ): Promise<InstalledApplicationInfo[]> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.listInstalledApps(includeSystemApps);
  },

  async uninstallPackage(packageName: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.uninstallPackage(packageName);
  },

  async exitApplication(): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      return false;
    }

    return nativeModule.exitApplication();
  },

  async startMediaFile(path: string): Promise<MediaPlaybackStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.startMediaFile(path);
  },

  async pauseMediaPlayback(): Promise<MediaPlaybackStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.pauseMediaPlayback();
  },

  async resumeMediaPlayback(): Promise<MediaPlaybackStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.resumeMediaPlayback();
  },

  async stopMediaPlayback(): Promise<MediaPlaybackStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.stopMediaPlayback();
  },

  async seekMediaPlayback(positionMs: number): Promise<MediaPlaybackStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.seekMediaPlayback(positionMs);
  },

  async getMediaPlaybackStatus(): Promise<MediaPlaybackStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.getMediaPlaybackStatus();
  },

  async startFtpServer(includeHidden: boolean): Promise<FtpServerStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.startFtpServer(includeHidden);
  },

  async stopFtpServer(): Promise<FtpServerStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.stopFtpServer();
  },
};

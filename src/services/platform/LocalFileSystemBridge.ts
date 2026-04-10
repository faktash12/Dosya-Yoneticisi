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
  extension?: string | null;
  mimeType?: string | null;
  childCount?: number;
  permissions: NativeFilePermissions;
}

interface LocalFileSystemModuleShape {
  getRootDirectory: () => Promise<string>;
  listDirectory: (path: string) => Promise<NativeFileSystemNode[]>;
  readTextFile: (path: string) => Promise<string>;
  openFile: (path: string) => Promise<boolean>;
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

  async openFile(path: string): Promise<boolean> {
    if (Platform.OS !== 'android' || !nativeModule) {
      throw new LocalFileSystemUnavailableError();
    }

    return nativeModule.openFile(path);
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
};

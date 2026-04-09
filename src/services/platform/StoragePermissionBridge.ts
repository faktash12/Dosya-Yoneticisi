import {NativeModules, Platform} from 'react-native';

interface StoragePermissionModuleShape {
  isAllFilesAccessGranted: () => Promise<boolean>;
  openAllFilesAccessSettings: () => Promise<boolean>;
}

const nativeModule = NativeModules.StoragePermissionModule as
  | StoragePermissionModuleShape
  | undefined;

export type StorageAccessStatus = 'granted' | 'missing' | 'unsupported';

export const storagePermissionBridge = {
  async getStatus(): Promise<StorageAccessStatus> {
    if (Platform.OS !== 'android' || !nativeModule) {
      return 'unsupported';
    }

    const granted = await nativeModule.isAllFilesAccessGranted();
    return granted ? 'granted' : 'missing';
  },

  async requestAccess(): Promise<void> {
    if (Platform.OS !== 'android' || !nativeModule) {
      return;
    }

    await nativeModule.openAllFilesAccessSettings();
  },
};

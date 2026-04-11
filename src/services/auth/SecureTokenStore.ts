import AsyncStorage from '@react-native-async-storage/async-storage';

import type {
  CloudAuthSession,
  CloudProviderId,
} from '@/domain/entities/CloudProvider';

export interface SecureTokenStore {
  getSession(providerId: CloudProviderId): Promise<CloudAuthSession | null>;
  saveSession(session: CloudAuthSession): Promise<void>;
  clearSession(providerId: CloudProviderId): Promise<void>;
}

const storageKey = (providerId: CloudProviderId): string =>
  `cloud-token:${providerId}`;

export class AsyncStorageSecureTokenStore implements SecureTokenStore {
  async getSession(providerId: CloudProviderId): Promise<CloudAuthSession | null> {
    const rawValue = await AsyncStorage.getItem(storageKey(providerId));

    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue) as CloudAuthSession;
    } catch {
      await this.clearSession(providerId);
      return null;
    }
  }

  async saveSession(session: CloudAuthSession): Promise<void> {
    await AsyncStorage.setItem(storageKey(session.providerId), JSON.stringify(session));
  }

  async clearSession(providerId: CloudProviderId): Promise<void> {
    await AsyncStorage.removeItem(storageKey(providerId));
  }
}

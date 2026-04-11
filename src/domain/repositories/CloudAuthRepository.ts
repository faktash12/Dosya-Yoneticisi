import type {
  CloudAuthSession,
  CloudProviderId,
} from '@/domain/entities/CloudProvider';

export interface CloudAuthStartRequest {
  providerId: CloudProviderId;
  authUrl: string;
  redirectUri: string;
  codeVerifier: string;
  state: string;
}

export interface CloudAuthRepository {
  startAuthorization(request: CloudAuthStartRequest): Promise<string>;
  getSession(providerId: CloudProviderId): Promise<CloudAuthSession | null>;
  saveSession(session: CloudAuthSession): Promise<void>;
  clearSession(providerId: CloudProviderId): Promise<void>;
}

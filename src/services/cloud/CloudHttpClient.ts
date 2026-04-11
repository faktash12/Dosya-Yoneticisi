import axios, {type AxiosRequestConfig} from 'axios';

import type {
  CloudAuthSession,
  CloudProviderId,
} from '@/domain/entities/CloudProvider';
import type {CloudProviderConfig} from '@/config/cloudConfig';
import type {OAuthService} from '@/services/auth/OAuthService';

export class CloudHttpClient {
  constructor(private readonly oauthService: OAuthService) {}

  async request<TResponse>(
    providerId: CloudProviderId,
    config: CloudProviderConfig,
    session: CloudAuthSession,
    requestConfig: AxiosRequestConfig,
  ): Promise<TResponse> {
    try {
      return await this.authorizedRequest<TResponse>(session, requestConfig);
    } catch (error) {
      if (!axios.isAxiosError(error) || error.response?.status !== 401) {
        throw error;
      }

      const refreshedSession = await this.oauthService.refresh(providerId, config);

      if (!refreshedSession) {
        throw error;
      }

      return this.authorizedRequest<TResponse>(refreshedSession, requestConfig);
    }
  }

  private async authorizedRequest<TResponse>(
    session: CloudAuthSession,
    requestConfig: AxiosRequestConfig,
  ): Promise<TResponse> {
    const response = await axios.request<TResponse>({
      timeout: 30_000,
      ...requestConfig,
      headers: {
        ...(requestConfig.headers ?? {}),
        Authorization: `${session.tokenType} ${session.accessToken}`,
      },
    });

    return response.data;
  }
}

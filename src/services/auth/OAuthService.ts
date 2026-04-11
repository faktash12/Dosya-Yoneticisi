import {Linking} from 'react-native';
import axios from 'axios';

import type {
  CloudAuthSession,
  CloudProviderId,
} from '@/domain/entities/CloudProvider';
import type {CloudProviderConfig} from '@/config/cloudConfig';
import {
  createCodeVerifier,
  createOAuthState,
  createPkceChallenge,
} from '@/services/auth/pkce';
import type {SecureTokenStore} from '@/services/auth/SecureTokenStore';

interface OAuthEndpointConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  extraAuthParams?: Record<string, string>;
  extraTokenParams?: Record<string, string>;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

const providerEndpoints: Partial<Record<CloudProviderId, OAuthEndpointConfig>> = {
  google_drive: {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    extraAuthParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },
  yandex_disk: {
    authorizationEndpoint: 'https://oauth.yandex.com/authorize',
    tokenEndpoint: 'https://oauth.yandex.com/token',
  },
};

export class CloudProviderNotConfiguredError extends Error {
  constructor(displayName: string) {
    super(`${displayName} için OAuth yapılandırması eksik.`);
    this.name = 'CloudProviderNotConfiguredError';
  }
}

export class OAuthService {
  constructor(private readonly tokenStore: SecureTokenStore) {}

  async authorize(
    providerId: CloudProviderId,
    config: CloudProviderConfig,
  ): Promise<CloudAuthSession> {
    if (!config.clientId || !config.redirectUri) {
      throw new CloudProviderNotConfiguredError(providerId);
    }

    const endpoints = providerEndpoints[providerId];
    if (!endpoints) {
      throw new CloudProviderNotConfiguredError(providerId);
    }

    const state = createOAuthState();
    const codeVerifier = createCodeVerifier();
    const codeChallenge = createPkceChallenge(codeVerifier);
    const authUrl = this.createAuthorizationUrl(
      endpoints.authorizationEndpoint,
      config,
      state,
      codeChallenge,
      endpoints.extraAuthParams,
    );
    const redirectUrl = await this.waitForRedirect(authUrl, config.redirectUri);
    const callbackUrl = new URL(redirectUrl);
    const error = callbackUrl.searchParams.get('error');

    if (error) {
      throw new Error(`Hesap bağlanamadı: ${error}`);
    }

    if (callbackUrl.searchParams.get('state') !== state) {
      throw new Error('Hesap bağlama doğrulaması geçersiz.');
    }

    const code = callbackUrl.searchParams.get('code');

    if (!code) {
      throw new Error('OAuth dönüşünde yetki kodu bulunamadı.');
    }

    const token = await this.exchangeCode(
      endpoints.tokenEndpoint,
      config,
      code,
      codeVerifier,
      endpoints.extraTokenParams,
    );
    const session: CloudAuthSession = {
      providerId,
      accessToken: token.access_token,
      ...(token.refresh_token ? {refreshToken: token.refresh_token} : {}),
      ...(token.expires_in
        ? {expiresAt: Date.now() + token.expires_in * 1000 - 60_000}
        : {}),
      tokenType: 'Bearer',
      ...(token.scope ? {scope: token.scope} : {}),
    };

    await this.tokenStore.saveSession(session);
    return session;
  }

  async refresh(
    providerId: CloudProviderId,
    config: CloudProviderConfig,
  ): Promise<CloudAuthSession | null> {
    const session = await this.tokenStore.getSession(providerId);

    if (!session?.refreshToken) {
      return session;
    }

    if (session.expiresAt && session.expiresAt > Date.now()) {
      return session;
    }

    const endpoints = providerEndpoints[providerId];
    if (!endpoints) {
      return session;
    }

    const body = new URLSearchParams({
      client_id: config.clientId,
      grant_type: 'refresh_token',
      refresh_token: session.refreshToken,
    });

    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret);
    }

    const response = await axios.post<TokenResponse>(
      endpoints.tokenEndpoint,
      body.toString(),
      {headers: {'Content-Type': 'application/x-www-form-urlencoded'}},
    );
    const nextSession: CloudAuthSession = {
      ...session,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token ?? session.refreshToken,
      ...(response.data.expires_in
        ? {expiresAt: Date.now() + response.data.expires_in * 1000 - 60_000}
        : {}),
      ...(response.data.scope ? {scope: response.data.scope} : {}),
    };

    await this.tokenStore.saveSession(nextSession);
    return nextSession;
  }

  async getSession(providerId: CloudProviderId): Promise<CloudAuthSession | null> {
    return this.tokenStore.getSession(providerId);
  }

  async clearSession(providerId: CloudProviderId): Promise<void> {
    await this.tokenStore.clearSession(providerId);
  }

  async saveSession(session: CloudAuthSession): Promise<void> {
    await this.tokenStore.saveSession(session);
  }

  private createAuthorizationUrl(
    endpoint: string,
    config: CloudProviderConfig,
    state: string,
    codeChallenge: string,
    extraParams: Record<string, string> = {},
  ): string {
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      ...extraParams,
    });

    return `${endpoint}?${params.toString()}`;
  }

  private async waitForRedirect(
    authUrl: string,
    redirectUri: string,
  ): Promise<string> {
    const matchesRedirect = (url: string | null | undefined): url is string =>
      typeof url === 'string' && url.startsWith(redirectUri);

    return new Promise((resolve, reject) => {
      let isSettled = false;
      const subscription = Linking.addEventListener('url', event => {
        if (!matchesRedirect(event.url)) {
          return;
        }

        finishWithSuccess(event.url);
      });

      const finish = () => {
        if (isSettled) {
          return false;
        }

        isSettled = true;
        clearTimeout(timeoutId);
        subscription.remove();
        return true;
      };

      const finishWithSuccess = (url: string) => {
        if (finish()) {
          resolve(url);
        }
      };

      const finishWithError = (error: Error) => {
        if (finish()) {
          reject(error);
        }
      };

      const timeoutId = setTimeout(() => {
        finishWithError(new Error('Hesap bağlama zaman aşımına uğradı.'));
      }, 120_000);

      void Linking.getInitialURL()
        .then(initialUrl => {
          if (matchesRedirect(initialUrl)) {
            finishWithSuccess(initialUrl);
          }
        })
        .catch(error => {
          finishWithError(
            error instanceof Error ? error : new Error(String(error)),
          );
        });

      Linking.openURL(authUrl).catch(error => {
        finishWithError(
          error instanceof Error ? error : new Error(String(error)),
        );
      });
    });
  }

  private async exchangeCode(
    tokenEndpoint: string,
    config: CloudProviderConfig,
    code: string,
    codeVerifier: string,
    extraParams: Record<string, string> = {},
  ): Promise<TokenResponse> {
    const body = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      code,
      code_verifier: codeVerifier,
      ...extraParams,
    });

    if (config.clientSecret) {
      body.set('client_secret', config.clientSecret);
    }

    const response = await axios.post<TokenResponse>(
      tokenEndpoint,
      body.toString(),
      {headers: {'Content-Type': 'application/x-www-form-urlencoded'}},
    );

    return response.data;
  }
}

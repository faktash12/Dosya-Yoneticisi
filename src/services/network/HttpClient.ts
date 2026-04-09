import axios, {type AxiosInstance, type AxiosRequestConfig} from 'axios';

import {appLogger} from '@/services/logging/AppLogger';

export class HttpClient {
  private readonly client: AxiosInstance;

  constructor(baseURL?: string) {
    this.client = axios.create({
      timeout: 15_000,
      ...(baseURL ? {baseURL} : {}),
    });

    this.client.interceptors.request.use(config => {
      appLogger.debug({
        scope: 'HttpClient',
        message: `${config.method?.toUpperCase()} ${config.url}`,
      });

      return config;
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        appLogger.error({
          scope: 'HttpClient',
          message: 'Network request failed',
          data: error,
        });

        return Promise.reject(error);
      },
    );
  }

  async request<TResponse>(config: AxiosRequestConfig): Promise<TResponse> {
    const response = await this.client.request<TResponse>(config);
    return response.data;
  }
}

export const defaultHttpClient = new HttpClient();

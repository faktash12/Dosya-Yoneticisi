import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@file-manager-pro/app-diagnostics';
const MAX_ENTRIES = 60;

export type DiagnosticLevel = 'info' | 'warn' | 'error';

export interface DiagnosticEntry {
  id: string;
  level: DiagnosticLevel;
  scope: string;
  message: string;
  timestamp: string;
  details?: string;
}

const createId = (): string => {
  return `diag-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error('Unknown error');
};

const stringifyDetails = (details: unknown): string | undefined => {
  if (details == null) {
    return undefined;
  }

  if (typeof details === 'string') {
    return details;
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
};

const appendEntry = async (entry: DiagnosticEntry): Promise<void> => {
  try {
    const current = await AsyncStorage.getItem(STORAGE_KEY);
    const parsed: DiagnosticEntry[] = current ? JSON.parse(current) : [];
    const next = [...parsed, entry].slice(-MAX_ENTRIES);

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Diagnostics must never crash the app.
  }
};

export const appDiagnostics = {
  async record(level: DiagnosticLevel, scope: string, message: string, details?: unknown): Promise<void> {
    const entry: DiagnosticEntry = {
      id: createId(),
      level,
      scope,
      message,
      timestamp: new Date().toISOString(),
    };

    const serializedDetails = stringifyDetails(details);

    if (serializedDetails) {
      entry.details = serializedDetails;
    }

    await appendEntry(entry);
  },

  async recordBreadcrumb(scope: string, message: string, details?: unknown): Promise<void> {
    await this.record('info', scope, message, details);
  },

  async recordError(scope: string, error: unknown, details?: unknown): Promise<void> {
    const normalizedError = normalizeError(error);

    await this.record('error', scope, normalizedError.message, {
      stack: normalizedError.stack,
      extra: details,
    });
  },

  async getEntries(): Promise<DiagnosticEntry[]> {
    try {
      const current = await AsyncStorage.getItem(STORAGE_KEY);
      return current ? JSON.parse(current) : [];
    } catch {
      return [];
    }
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // No-op.
    }
  },
};

type GlobalErrorUtils = {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

export const installGlobalErrorHandlers = (): void => {
  const globalWithErrorUtils = globalThis as typeof globalThis & {
    ErrorUtils?: GlobalErrorUtils;
  };

  const errorUtils = globalWithErrorUtils.ErrorUtils;

  if (!errorUtils?.setGlobalHandler) {
    return;
  }

  const defaultHandler = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error, isFatal) => {
    void appDiagnostics.recordError('GlobalErrorHandler', error, {
      isFatal: Boolean(isFatal),
    });

    if (defaultHandler) {
      defaultHandler(error, isFatal);
    }
  });
};

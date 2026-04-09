export type Nullable<T> = T | null;

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AppErrorDescriptor {
  code: string;
  message: string;
  recoverable: boolean;
  details?: string;
}

export type Result<T> =
  | {
      ok: true;
      data: T;
    }
  | {
      ok: false;
      error: AppErrorDescriptor;
    };


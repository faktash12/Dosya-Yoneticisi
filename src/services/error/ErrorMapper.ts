import type {AppErrorDescriptor} from '@/types/common';

export const mapUnknownError = (
  error: unknown,
  fallbackMessage = 'Beklenmeyen bir hata olustu.',
): AppErrorDescriptor => {
  if (error instanceof Error) {
    const descriptor: AppErrorDescriptor = {
      code: 'UNEXPECTED_ERROR',
      message: error.message,
      recoverable: true,
    };

    if (error.stack) {
      descriptor.details = error.stack;
    }

    return descriptor;
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: fallbackMessage,
    recoverable: true,
  };
};

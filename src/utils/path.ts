import {ROOT_DIRECTORY} from '@/constants/app';

export const getParentPath = (path: string): string => {
  if (path === ROOT_DIRECTORY) {
    return ROOT_DIRECTORY;
  }

  const segments = path.split('/').filter(Boolean);

  if (segments.length <= 3) {
    return ROOT_DIRECTORY;
  }

  return `/${segments.slice(0, -1).join('/')}`;
};

export const getPathLabel = (path: string): string => {
  if (path === ROOT_DIRECTORY) {
    return 'Ana bellek';
  }

  const segments = path.split('/').filter(Boolean);
  return segments.at(-1) ?? 'Ana bellek';
};

export const getPathSegments = (path: string): string[] => {
  if (path === ROOT_DIRECTORY) {
    return ['Ana bellek'];
  }

  const rootSegments = ROOT_DIRECTORY.split('/').filter(Boolean);
  const segments = path.split('/').filter(Boolean);
  const relativeSegments = segments.slice(rootSegments.length);

  return ['Ana bellek', ...relativeSegments];
};

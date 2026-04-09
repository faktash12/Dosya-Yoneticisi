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
  return path.replace('/storage/emulated/0', 'Dahili Depolama');
};

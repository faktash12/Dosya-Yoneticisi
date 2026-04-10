export const APP_NAME = 'Dosya Yöneticisi';
export const ROOT_DIRECTORY = '/storage/emulated/0';
export const TRASH_DIRECTORY = `${ROOT_DIRECTORY}/.dosya-yoneticisi-trash`;
export const DEFAULT_TRANSFER_CONCURRENCY = 2;
export const STORAGE_ANALYSIS_SEGMENTS = [
  {label: 'Belgeler', usedBytes: 18 * 1024 * 1024 * 1024},
  {label: 'Medya', usedBytes: 56 * 1024 * 1024 * 1024},
  {label: 'Arsiv', usedBytes: 11 * 1024 * 1024 * 1024},
  {label: 'Diger', usedBytes: 7 * 1024 * 1024 * 1024},
] as const;

export const APP_NAME = 'Dosya Yöneticisi';
export const ROOT_DIRECTORY = '/storage/emulated/0';
export const TRASH_DIRECTORY = `${ROOT_DIRECTORY}/.dosya-yoneticisi-trash`;
export const DEFAULT_TRANSFER_CONCURRENCY = 2;
export const STORAGE_ANALYSIS_SEGMENTS = [
  {
    label: 'Belgeler',
    usedBytes: 18 * 1024 * 1024 * 1024,
    breakdown: [
      {label: 'PDF', usedBytes: 6 * 1024 * 1024 * 1024},
      {label: 'Word', usedBytes: 5 * 1024 * 1024 * 1024},
      {label: 'Excel', usedBytes: 4 * 1024 * 1024 * 1024},
      {label: 'Metin', usedBytes: 3 * 1024 * 1024 * 1024},
    ],
  },
  {
    label: 'Medya',
    usedBytes: 56 * 1024 * 1024 * 1024,
    breakdown: [
      {label: 'Müzik', usedBytes: 12 * 1024 * 1024 * 1024},
      {label: 'Video', usedBytes: 28 * 1024 * 1024 * 1024},
      {label: 'Görseller', usedBytes: 16 * 1024 * 1024 * 1024},
    ],
  },
  {
    label: 'Arşiv',
    usedBytes: 11 * 1024 * 1024 * 1024,
    breakdown: [
      {label: 'ZIP', usedBytes: 5 * 1024 * 1024 * 1024},
      {label: 'RAR', usedBytes: 4 * 1024 * 1024 * 1024},
      {label: '7Z', usedBytes: 2 * 1024 * 1024 * 1024},
    ],
  },
  {
    label: 'Diğer',
    usedBytes: 7 * 1024 * 1024 * 1024,
    breakdown: [
      {label: 'Uygulama verisi', usedBytes: 3 * 1024 * 1024 * 1024},
      {label: 'Geçici dosyalar', usedBytes: 2 * 1024 * 1024 * 1024},
      {label: 'Kalan içerik', usedBytes: 2 * 1024 * 1024 * 1024},
    ],
  },
] as const;

import {ROOT_DIRECTORY, TRASH_DIRECTORY} from '@/constants/app';
import type {
  ExplorerCategoryAction,
  ExplorerCategoryId,
  ExplorerEmptyStateConfig,
  ExplorerHomeEntryId,
  ExplorerPlaceholderKind,
  ExplorerPlaceholderView,
} from '@/features/explorer/types/explorer.types';

const createEmptyState = (
  title: string,
  description: string,
  icon: ExplorerEmptyStateConfig['icon'],
): ExplorerEmptyStateConfig => ({
  title,
  description,
  icon,
});

const createPlaceholder = (
  id: string,
  kind: ExplorerPlaceholderKind,
  title: string,
  description: string,
  supportingLines?: string[],
  ctaLabel?: string,
): ExplorerPlaceholderView => ({
  id,
  kind,
  title,
  description,
  ...(supportingLines ? {supportingLines} : {}),
  ...(ctaLabel ? {ctaLabel} : {}),
});

export const createUnsupportedCategoryPlaceholder = (
  label = 'Bu kategori',
  details?: string,
): ExplorerPlaceholderView =>
  createPlaceholder(
    'unsupported-category',
    'unsupported-category',
    label,
    details ??
      'Bu kaynak güvenli fallback ile açıldı. Kategori eşlemesi bulunamadı veya kaynak kullanılamıyor.',
    [
      'Explorer kapanmadan devam eder.',
      'Ana ekrandan başka bir kategori seçebilirsiniz.',
    ],
    'Ana sayfaya dön',
  );

export const createQuickActionPlaceholder = (
  quickActionId: 'search' | 'recents' | 'cloud',
): ExplorerPlaceholderView => {
  switch (quickActionId) {
    case 'search':
      return createPlaceholder(
        'search',
        'unsupported-category',
        'Arama',
        'Arama yüzeyi henüz explorer veri sağlayıcılarıyla bağlanmadı.',
        [
          'Kategori girişleri ve dosya listeleri çalışmaya devam eder.',
          'Bu ekran boş bırakılmaz; özellik durumu net olarak gösterilir.',
        ],
        'Kategorilere dön',
      );
    case 'recents':
      return createPlaceholder(
        'recents',
        'unsupported-category',
        'Son Kullanılan',
        'Hızlı aksiyon yüzeyi henüz ayrı bir son kullanılanlar moduna bağlanmadı.',
        [
          'Yeni Dosyalar kategorisi gerçek explorer listesi olarak çalışır.',
          'Bu hızlı aksiyon sonraki aşamada o listeye bağlanabilir.',
        ],
        'Yeni Dosyalar’a göz at',
      );
    case 'cloud':
      return createPlaceholder(
        'cloud-quick-action',
        'cloud-hub',
        'Bulut',
        'Bulut sağlayıcılarına tek merkezden erişebilirsiniz.',
        [
          'Google Drive, OneDrive ve Yandex Disk hazır.',
          'Bağlı hesap yoksa boş ekran yerine premium bilgi görünümü sunulur.',
        ],
        'Sağlayıcıları incele',
      );
  }
};

const directoryAction = (
  categoryId: ExplorerCategoryId,
  path: string,
  emptyState: ExplorerEmptyStateConfig,
): ExplorerCategoryAction => ({
  kind: 'directory',
  path,
  providerId: 'local',
  categoryId,
  emptyState,
});

export const resolveExplorerCategoryAction = (
  categoryId: ExplorerHomeEntryId | string,
): ExplorerCategoryAction => {
  const actions: Record<ExplorerHomeEntryId, ExplorerCategoryAction> = {
    'internal-storage': directoryAction(
      'internal-storage',
      ROOT_DIRECTORY,
      createEmptyState(
        'Bu cihazda henüz içerik yok',
        'Yerel kök depolama şu anda boş görünüyor. İçerik eklendiğinde explorer burada listeler.',
        'storage',
      ),
    ),
    downloads: directoryAction(
      'downloads',
      `${ROOT_DIRECTORY}/Download`,
      createEmptyState(
        'İndirilenler boş',
        'Bu kaynakta henüz içerik yok. Yeni indirilen dosyalar burada görünecek.',
        'downloads',
      ),
    ),
    documents: directoryAction(
      'documents',
      `${ROOT_DIRECTORY}/Documents`,
      createEmptyState(
        'Belge bulunmuyor',
        'Bu kaynakta henüz belge yok. PDF, DOCX ve klasörler burada listelenecek.',
        'documents',
      ),
    ),
    images: directoryAction(
      'images',
      `${ROOT_DIRECTORY}/Pictures`,
      createEmptyState(
        'Görüntü bulunmuyor',
        'Bu kaynakta henüz medya içeriği yok. Ekran görüntüleri ve fotoğraflar burada görünür.',
        'images',
      ),
    ),
    audio: directoryAction(
      'audio',
      `${ROOT_DIRECTORY}/Music`,
      createEmptyState(
        'Ses dosyası bulunmuyor',
        'Bu kaynakta henüz ses içeriği yok. Müzik ve kayıtlar burada listelenecek.',
        'audio',
      ),
    ),
    video: directoryAction(
      'video',
      `${ROOT_DIRECTORY}/Movies`,
      createEmptyState(
        'Video bulunmuyor',
        'Bu kaynakta henüz video içeriği yok. Filmler ve klipler burada görünür.',
        'video',
      ),
    ),
    recent: directoryAction(
      'recent',
      ROOT_DIRECTORY,
      createEmptyState(
        'Yeni dosya bulunmuyor',
        'Son eklenen dosyalar taranamadı veya bu konumda yeni içerik bulunamadı.',
        'recent',
      ),
    ),
    'sd-card': {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'sd-card',
        'unsupported-category',
        'SD kart',
        'Harici SD kart bu sürümde ayrı bir kök olarak bağlanmadı.',
        [
          'Kart yuvası için ayrı sağlayıcı desteği sonraki fazda eklenebilir.',
          'Şu an bu giriş güvenli bilgi ekranı olarak açılır.',
        ],
        'Ana sayfaya dön',
      ),
    },
    system: directoryAction(
      'system',
      '/',
      createEmptyState(
        'Sistem klasörü açılamadı',
        'Android sistem klasörleri cihaz izinlerine göre sınırlı olabilir.',
        'system',
      ),
    ),
    cloud: {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'cloud',
        'cloud-hub',
        'Bulut',
        'Bağlı sağlayıcılar ve uzak depolama geçitleri burada görünür.',
        [
          'Sağlayıcı listesi boş olsa bile ekran boş kalmaz.',
          'Cloud hub ekranı explorer ile aynı görsel dilde çalışır.',
        ],
        'Sağlayıcıları görüntüle',
      ),
    },
    remote: {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'remote',
        'remote-access',
        'Uzak',
        'Harici uzak kaynak bağlantıları için hazırlanan bilgi ekranı.',
        [
          'SFTP ve benzeri uç noktalar sonraki fazda bağlanacak.',
          'Bu arayüz kullanıcının boş ekran görmesini engeller.',
        ],
        'Ana sayfaya dön',
      ),
    },
    network: {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'network',
        'network-access',
        'Erişim',
        'Telefon depolamasına yerel ağ üzerinden erişim ayarları.',
        [],
        'Başlat',
      ),
    },
    trash: {
      kind: 'directory',
      path: TRASH_DIRECTORY,
      providerId: 'local',
      categoryId: 'trash',
      emptyState: createEmptyState(
        'Çöp kutusu boş',
        'Silinen dosyalar burada 30 gün tutulur, sonra otomatik olarak temizlenir.',
        'trash',
      ),
    },
    apps: {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'apps',
        'apps-info',
        'Uygulamalar',
        'Cihazdaki yüklü uygulamalar ve kaldırma işlemleri burada listelenir.',
        [
          'Her satırda gerçek uygulama simgesi ve boyutu gösterilir.',
          'Uzun basınca kaldırma işlemi Android ekranına yönlendirilir.',
        ],
        'Ana sayfaya dön',
      ),
    },
  };

  return actions[categoryId as ExplorerHomeEntryId] ?? {
    kind: 'placeholder',
    placeholder: createUnsupportedCategoryPlaceholder(categoryId),
  };
};

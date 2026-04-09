import {ROOT_DIRECTORY} from '@/constants/app';
import type {
  ExplorerCategoryAction,
  ExplorerCategoryId,
  ExplorerEmptyStateConfig,
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
      'Dashboard üzerinden başka bir kategori seçebilirsiniz.',
    ],
    'Dashboard’a dön',
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
  categoryId: ExplorerCategoryId,
): ExplorerCategoryAction => {
  const actions: Record<ExplorerCategoryId, ExplorerCategoryAction> = {
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
      `${ROOT_DIRECTORY}/Recent`,
      createEmptyState(
        'Yeni dosya bulunmuyor',
        'Yakın zamanda eklenen içerik olduğunda bu akış otomatik olarak güncellenecek.',
        'recent',
      ),
    ),
    system: {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'system',
        'system-info',
        'Sistem',
        'Sistem alanı bu sürümde yalnızca güvenli bilgi ekranı olarak sunulur.',
        [
          'Korunan klasörler için yazma işlemleri açılmamıştır.',
          'Explorer akışı bozulmadan geri dönebilirsiniz.',
        ],
        'Explorer’a dön',
      ),
    },
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
        'Dashboard’a dön',
      ),
    },
    network: {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'network',
        'network-access',
        'Ağdan erişim',
        'SMB, WebDAV ve LAN paylaşımları için ayrılmış güvenli placeholder.',
        [
          'Ağ yolu entegrasyonları henüz aktif değil.',
          'Kategori açıldığında ekran her zaman anlamlı bilgi verir.',
        ],
        'Dashboard’a dön',
      ),
    },
    trash: {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'trash',
        'recycle-bin',
        'Geri Dönüşüm',
        'Silinen dosyalar için kalıcı geri dönüşüm akışı henüz mock seviyesinde.',
        [
          'Silinen içerikler şu an fiziksel geri dönüşümde tutulmuyor.',
          'Bu ekran yine de boş veya siyah görünmez.',
        ],
        'Explorer’a dön',
      ),
    },
    apps: {
      kind: 'placeholder',
      placeholder: createPlaceholder(
        'apps',
        'apps-info',
        'Uygulamalar',
        'APK paketleri ve uygulama dosyaları için hazırlanan bilgi ekranı.',
        [
          'Kurulu uygulama envanteri bu sürümde bağlanmadı.',
          'Yüzey aktif ama güvenli placeholder davranışıyla açılır.',
        ],
        'Dashboard’a dön',
      ),
    },
  };

  return actions[categoryId] ?? {
    kind: 'placeholder',
    placeholder: createUnsupportedCategoryPlaceholder(categoryId),
  };
};

import {useMemo} from 'react';

import {useUiStore, type AppLocale} from '@/app/store/ui.store';

type TranslationKey =
  | 'common.cancel'
  | 'common.save'
  | 'common.processing'
  | 'common.start'
  | 'common.stop'
  | 'common.open'
  | 'common.selected'
  | 'common.backToHome'
  | 'app.title'
  | 'explorer.searchHome'
  | 'explorer.searchFolder'
  | 'explorer.exitTitle'
  | 'explorer.exitMessage'
  | 'explorer.exitConfirm'
  | 'explorer.menu.viewMode'
  | 'explorer.menu.sort'
  | 'explorer.menu.new'
  | 'explorer.menu.newText'
  | 'explorer.menu.newFolder'
  | 'explorer.menu.analyze'
  | 'explorer.menu.refresh'
  | 'explorer.menu.hiddenFiles'
  | 'explorer.menu.settings'
  | 'explorer.modal.enterName'
  | 'explorer.modal.confirmDelete'
  | 'explorer.modal.trashInfo'
  | 'explorer.modal.delete'
  | 'explorer.modal.dismiss'
  | 'explorer.empty.noAppsTitle'
  | 'explorer.empty.noAppsDescription'
  | 'explorer.empty.noAppsSupporting'
  | 'explorer.empty.previewTitle'
  | 'explorer.empty.previewSupporting'
  | 'explorer.empty.analysisFailed'
  | 'explorer.empty.storageEmpty'
  | 'explorer.cloud.connected'
  | 'explorer.cloud.disconnected'
  | 'selection.selectedCount'
  | 'selection.selectAll'
  | 'selection.delete'
  | 'selection.emptyTrash'
  | 'selection.toggleVisibility'
  | 'selection.openFolder'
  | 'selection.extractArchive'
  | 'selection.share'
  | 'selection.openWith'
  | 'selection.rename'
  | 'selection.favorite'
  | 'selection.copy'
  | 'selection.move'
  | 'settings.title'
  | 'settings.description'
  | 'settings.theme'
  | 'settings.language'
  | 'settings.cloudProviders'
  | 'settings.about'
  | 'settings.version'
  | 'settings.theme.system'
  | 'settings.theme.light'
  | 'settings.theme.dark'
  | 'settings.language.selected'
  | 'settings.language.select'
  | 'settings.providerConnected'
  | 'settings.providerPending'
  | 'settings.aboutDeveloper'
  | 'settings.aboutBody'
  | 'settings.aboutLicense'
  | 'settings.versionCurrentNotes'
  | 'settings.versionLegacyNotes'
  | 'settings.sheetClose'
  | 'settings.sheetVersionTitle'
  | 'settings.sheetAboutTitle'
  | 'analysis.title'
  | 'analysis.description'
  | 'analysis.usedTotal'
  | 'analysis.legend'
  | 'analysis.noData'
  | 'analysis.noDataDescription'
  | 'analysis.categories.images'
  | 'analysis.categories.videos'
  | 'analysis.categories.audio'
  | 'analysis.categories.documents'
  | 'analysis.categories.apps'
  | 'analysis.categories.archives'
  | 'analysis.categories.other';

type TranslationValues = Record<string, string | number>;

const translations: Record<AppLocale, Record<TranslationKey, string>> = {
  tr: {
    'common.cancel': 'Vazgeç',
    'common.save': 'Kaydet',
    'common.processing': 'İşleniyor',
    'common.start': 'Başlat',
    'common.stop': 'Durdur',
    'common.open': 'Aç',
    'common.selected': 'Seçili',
    'common.backToHome': 'Ana sayfaya dön',
    'app.title': 'Dosya Yöneticisi',
    'explorer.searchHome': 'Dosya ara',
    'explorer.searchFolder': 'Bu klasör ve alt klasörlerde ara',
    'explorer.exitTitle': 'Çıkış',
    'explorer.exitMessage': 'Uygulamadan çıkmak istediğinize emin misiniz?',
    'explorer.exitConfirm': 'Çıkış',
    'explorer.menu.viewMode': 'Görünüm çeşidi',
    'explorer.menu.sort': 'Sırala',
    'explorer.menu.new': 'Yeni',
    'explorer.menu.newText': 'Metin Belgesi Oluştur',
    'explorer.menu.newFolder': 'Klasör oluştur',
    'explorer.menu.analyze': 'Analiz et',
    'explorer.menu.refresh': 'Yenile',
    'explorer.menu.hiddenFiles': 'Gizli Dosya',
    'explorer.menu.settings': 'Ayarlar',
    'explorer.modal.enterName': 'Ad girin',
    'explorer.modal.confirmDelete': 'Silme işlemini onaylayın',
    'explorer.modal.trashInfo':
      'Seçilen öğeler çöp kutusuna taşınır. Çöp kutusunda Sil seçeneği kalıcı olarak siler.',
    'explorer.modal.delete': 'Sil',
    'explorer.modal.dismiss': 'Vazgeç',
    'explorer.empty.noAppsTitle': 'Uygulama bulunamadı',
    'explorer.empty.noAppsDescription':
      'Yüklü uygulamalar listesi şu anda boş görünüyor.',
    'explorer.empty.noAppsSupporting': 'Yenileyip tekrar deneyebilirsiniz.',
    'explorer.empty.previewTitle': 'Önizleme açılamadı',
    'explorer.empty.previewSupporting':
      'Dosyayı daha sonra başka bir uygulamayla açmayı deneyebilirsiniz.',
    'explorer.empty.analysisFailed': 'Analiz tamamlanamadı',
    'explorer.empty.storageEmpty': 'Depolama boş',
    'explorer.cloud.connected': 'Bağlı hesap hazır',
    'explorer.cloud.disconnected':
      'Henüz bağlantı yapılmadı. Sağlayıcı entegrasyonu daha sonra tamamlanabilir.',
    'selection.selectedCount': '{{count}} öğe seçildi',
    'selection.selectAll': 'Tümünü Seç',
    'selection.delete': 'Sil',
    'selection.emptyTrash': 'Boşalt',
    'selection.toggleVisibility': 'Göster/Gizle',
    'selection.openFolder': 'Klasöre Git',
    'selection.extractArchive': 'Klasöre Çıkar',
    'selection.share': 'Gönder',
    'selection.openWith': 'Birlikte Aç',
    'selection.rename': 'Adlandır',
    'selection.favorite': 'Favori',
    'selection.copy': 'Kopya',
    'selection.move': 'Taşı',
    'settings.title': 'Ayarlar',
    'settings.description': 'Tema, dil ve uygulama bilgileri burada yönetilir.',
    'settings.theme': 'Tema',
    'settings.language': 'Dil',
    'settings.cloudProviders': 'Bulut sağlayıcıları',
    'settings.about': 'Hakkında',
    'settings.version': 'Versiyon',
    'settings.theme.system': 'Sistem',
    'settings.theme.light': 'Açık',
    'settings.theme.dark': 'Koyu',
    'settings.language.selected': 'Seçili',
    'settings.language.select': 'Seç',
    'settings.providerConnected': 'Bağlı hesap hazır',
    'settings.providerPending':
      'Henüz bağlantı yapılmadı. Sağlayıcı entegrasyonu daha sonra tamamlanabilir.',
    'settings.aboutDeveloper': 'Geliştirici: Akblog Net',
    'settings.aboutBody':
      'Dosya Yöneticisi; yerel dosyaları, medya içeriklerini, uygulamaları ve bulut hesaplarını tek ekrandan yönetmek için geliştirilmiştir.',
    'settings.aboutLicense': 'Lisans ve üçüncü taraf bileşenleri sonraki sürümde listelenecek.',
    'settings.versionCurrentNotes':
      'Bulut bağlantıları, medya grupları, hızlı yeni dosyalar ve gelişmiş uygulama yönetimi eklendi.',
    'settings.versionLegacyNotes':
      'Yerel dosya gezgini, temel dosya işlemleri ve kategori ekranları yayınlandı.',
    'settings.sheetClose': 'Kapat',
    'settings.sheetVersionTitle': 'Sürüm Bilgisi',
    'settings.sheetAboutTitle': 'Uygulama Hakkında',
    'analysis.title': 'Depolama Analizi',
    'analysis.description':
      'Büyük klasörler, içerik dağılımı ve temizlenebilir alanlar burada özetlenir.',
    'analysis.usedTotal': 'Toplam kullanılan alan',
    'analysis.legend': 'Kategori Dağılımı',
    'analysis.noData': 'Depolama boş',
    'analysis.noDataDescription': 'Analiz edilecek dosya bulunamadı.',
    'analysis.categories.images': 'Görseller',
    'analysis.categories.videos': 'Videolar',
    'analysis.categories.audio': 'Ses Dosyaları',
    'analysis.categories.documents': 'Belgeler',
    'analysis.categories.apps': 'Uygulamalar',
    'analysis.categories.archives': 'Arşivler',
    'analysis.categories.other': 'Diğer',
  },
  en: {
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.processing': 'Processing',
    'common.start': 'Start',
    'common.stop': 'Stop',
    'common.open': 'Open',
    'common.selected': 'Selected',
    'common.backToHome': 'Back to home',
    'app.title': 'File Manager',
    'explorer.searchHome': 'Search files',
    'explorer.searchFolder': 'Search this folder and subfolders',
    'explorer.exitTitle': 'Exit',
    'explorer.exitMessage': 'Are you sure you want to exit the app?',
    'explorer.exitConfirm': 'Exit',
    'explorer.menu.viewMode': 'View mode',
    'explorer.menu.sort': 'Sort',
    'explorer.menu.new': 'New',
    'explorer.menu.newText': 'Create text document',
    'explorer.menu.newFolder': 'Create folder',
    'explorer.menu.analyze': 'Analyze',
    'explorer.menu.refresh': 'Refresh',
    'explorer.menu.hiddenFiles': 'Hidden files',
    'explorer.menu.settings': 'Settings',
    'explorer.modal.enterName': 'Enter a name',
    'explorer.modal.confirmDelete': 'Confirm delete',
    'explorer.modal.trashInfo':
      'Selected items are moved to the trash. Delete inside the trash removes them permanently.',
    'explorer.modal.delete': 'Delete',
    'explorer.modal.dismiss': 'Dismiss',
    'explorer.empty.noAppsTitle': 'No apps found',
    'explorer.empty.noAppsDescription':
      'The installed apps list appears to be empty right now.',
    'explorer.empty.noAppsSupporting': 'Refresh and try again.',
    'explorer.empty.previewTitle': 'Preview unavailable',
    'explorer.empty.previewSupporting':
      'You can try opening the file with another app later.',
    'explorer.empty.analysisFailed': 'Analysis failed',
    'explorer.empty.storageEmpty': 'Storage is empty',
    'explorer.cloud.connected': 'Connected account is ready',
    'explorer.cloud.disconnected':
      'No connection has been created yet. Provider integration can be completed later.',
    'selection.selectedCount': '{{count}} items selected',
    'selection.selectAll': 'Select all',
    'selection.delete': 'Delete',
    'selection.emptyTrash': 'Empty',
    'selection.toggleVisibility': 'Show/Hide',
    'selection.openFolder': 'Open folder',
    'selection.extractArchive': 'Extract',
    'selection.share': 'Share',
    'selection.openWith': 'Open with',
    'selection.rename': 'Rename',
    'selection.favorite': 'Favorite',
    'selection.copy': 'Copy',
    'selection.move': 'Move',
    'settings.title': 'Settings',
    'settings.description': 'Manage theme, language, and app information here.',
    'settings.theme': 'Theme',
    'settings.language': 'Language',
    'settings.cloudProviders': 'Cloud providers',
    'settings.about': 'About',
    'settings.version': 'Version',
    'settings.theme.system': 'System',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.language.selected': 'Selected',
    'settings.language.select': 'Select',
    'settings.providerConnected': 'Connected account is ready',
    'settings.providerPending':
      'No connection has been created yet. Provider integration can be completed later.',
    'settings.aboutDeveloper': 'Developer: Akblog Net',
    'settings.aboutBody':
      'File Manager is built to manage local files, media content, installed apps, and cloud accounts from a single screen.',
    'settings.aboutLicense': 'Licenses and third-party components will be listed in a later release.',
    'settings.versionCurrentNotes':
      'Cloud connections, media groups, faster recent files, and improved app management were added.',
    'settings.versionLegacyNotes':
      'The local file explorer, core file actions, and category screens were released.',
    'settings.sheetClose': 'Close',
    'settings.sheetVersionTitle': 'Version Information',
    'settings.sheetAboutTitle': 'About This App',
    'analysis.title': 'Storage Analysis',
    'analysis.description':
      'Large folders, content distribution, and reclaimable space are summarized here.',
    'analysis.usedTotal': 'Total used space',
    'analysis.legend': 'Category Breakdown',
    'analysis.noData': 'Storage is empty',
    'analysis.noDataDescription': 'No files were found to analyze.',
    'analysis.categories.images': 'Images',
    'analysis.categories.videos': 'Videos',
    'analysis.categories.audio': 'Audio Files',
    'analysis.categories.documents': 'Documents',
    'analysis.categories.apps': 'Applications',
    'analysis.categories.archives': 'Archives',
    'analysis.categories.other': 'Other',
  },
};

const supportedLocales: AppLocale[] = ['tr', 'en'];

export const languageOptions: Array<{
  locale: AppLocale;
  label: string;
  flag: string;
}> = [
  {locale: 'tr', label: 'Türkçe', flag: '🇹🇷'},
  {locale: 'en', label: 'English', flag: '🇬🇧'},
];

const interpolate = (template: string, values?: TranslationValues) => {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce(
    (accumulator, [key, value]) =>
      accumulator.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
};

export const useTranslation = () => {
  const rawLocale = useUiStore(state => state.locale);
  const locale = supportedLocales.includes(rawLocale) ? rawLocale : 'tr';

  return useMemo(
    () => ({
      locale,
      t: (key: TranslationKey, values?: TranslationValues) =>
        interpolate(translations[locale][key] ?? translations.tr[key], values),
    }),
    [locale],
  );
};

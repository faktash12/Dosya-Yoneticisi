import React, {useCallback, useEffect, useMemo} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Cloud,
  Download,
  Folder,
  HardDriveUpload,
  Link2Off,
  RefreshCcw,
} from 'lucide-react-native';

import {appContainer} from '@/app/di/container';
import {AppText} from '@/components/common/AppText';
import {EmptyState} from '@/components/feedback/EmptyState';
import type {
  CloudItem,
  CloudProviderId,
  CloudProviderSummary,
} from '@/domain/entities/CloudProvider';
import {useCloudStore} from '@/features/cloud/store/cloud.store';
import {useAppTheme} from '@/hooks/useAppTheme';
import {getCloudProviderDownloadDirectory} from '@/services/cloud/cloudPath';
import {localFileSystemBridge} from '@/services/platform/LocalFileSystemBridge';
import {formatAbsoluteDate} from '@/utils/formatAbsoluteDate';
import {formatBytes} from '@/utils/formatBytes';

interface CloudHubViewProps {
  providers: CloudProviderSummary[];
  onProvidersChanged: (providers: CloudProviderSummary[]) => void;
  onBack: () => void;
}

const providerColors: Record<CloudProviderId, string> = {
  google_drive: '#1A73E8',
  onedrive: '#2563EB',
  dropbox: '#0061FF',
  yandex_disk: '#DC2626',
};

const isPhaseTwoProvider = (providerId: CloudProviderId): boolean =>
  providerId === 'onedrive' || providerId === 'dropbox';

const getStatusLabel = (provider: CloudProviderSummary): string => {
  if (isPhaseTwoProvider(provider.providerId)) {
    return provider.errorMessage ?? 'Ikinci fazda eklenecek';
  }

  switch (provider.status) {
    case 'connected':
      return provider.account?.email ?? provider.account?.displayName ?? 'Bağlı';
    case 'not_configured':
      return provider.errorMessage ?? 'Yapılandırma eksik';
    case 'connecting':
      return 'Bağlanıyor';
    case 'error':
      return provider.errorMessage ?? 'Bağlantı hatası';
    case 'disconnected':
    default:
      return 'Bağlı değil';
  }
};

export const CloudHubView = ({
  providers,
  onProvidersChanged,
  onBack,
}: CloudHubViewProps): React.JSX.Element => {
  const theme = useAppTheme();
  const activeProviderId = useCloudStore(state => state.activeProviderId);
  const activeItems = useCloudStore(state => state.activeItems);
  const activeFolderId = useCloudStore(state => state.activeFolderId);
  const activePath = useCloudStore(state => state.activePath);
  const nextCursor = useCloudStore(state => state.nextCursor);
  const isLoading = useCloudStore(state => state.isLoading);
  const errorMessage = useCloudStore(state => state.errorMessage);
  const updateProvider = useCloudStore(state => state.updateProvider);
  const openFolder = useCloudStore(state => state.openFolder);
  const setItems = useCloudStore(state => state.setItems);
  const appendItems = useCloudStore(state => state.appendItems);
  const setLoading = useCloudStore(state => state.setLoading);
  const setErrorMessage = useCloudStore(state => state.setErrorMessage);
  const resetBrowser = useCloudStore(state => state.resetBrowser);
  const activeProvider = useMemo(
    () => providers.find(provider => provider.providerId === activeProviderId),
    [activeProviderId, providers],
  );

  const refreshProviders = useCallback(async () => {
    const summaries = await appContainer.getAvailableProvidersUseCase.execute();
    onProvidersChanged(summaries);
  }, [onProvidersChanged]);

  useEffect(() => {
    void refreshProviders();
  }, [refreshProviders]);

  const loadFolder = useCallback(
    async (input?: {cursor?: string | null; append?: boolean}) => {
      if (!activeProviderId) {
        return;
      }

      try {
        setLoading(true);
        const provider = appContainer.cloudProviderRegistry.get(activeProviderId);
        const page = await provider.listFolder({
          ...(activeFolderId ? {folderId: activeFolderId} : {}),
          path: activePath,
          ...(input?.cursor ? {cursor: input.cursor} : {}),
        });

        if (input?.append) {
          appendItems(page.items, page.nextCursor ?? null);
        } else {
          setItems(page.items, page.nextCursor ?? null);
        }
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Bulut klasörü okunamadı.',
        );
      }
    },
    [
      activeFolderId,
      activePath,
      activeProviderId,
      appendItems,
      setErrorMessage,
      setItems,
      setLoading,
    ],
  );

  useEffect(() => {
    if (activeProviderId) {
      void loadFolder();
    }
  }, [activeProviderId, activeFolderId, activePath, loadFolder]);

  const handleConnect = async (providerId: CloudProviderId) => {
    try {
      const provider = appContainer.cloudProviderRegistry.get(providerId);
      updateProvider({
        ...(await provider.getSummary()),
        status: 'connecting',
      });
      const summary = await provider.connect();
      updateProvider(summary);
      await refreshProviders();
    } catch (error) {
      Alert.alert(
        'Hesap bağlanamadı',
        error instanceof Error ? error.message : 'OAuth işlemi tamamlanamadı.',
      );
      await refreshProviders();
    }
  };

  const handleDisconnect = async (providerId: CloudProviderId) => {
    try {
      await appContainer.cloudProviderRegistry.get(providerId).disconnect();
      if (activeProviderId === providerId) {
        resetBrowser();
      }
      await refreshProviders();
    } catch (error) {
      Alert.alert(
        'Bağlantı kaldırılamadı',
        error instanceof Error ? error.message : 'Token temizlenemedi.',
      );
    }
  };

  const handleOpenProvider = (provider: CloudProviderSummary) => {
    openFolder({
      providerId: provider.providerId,
      folderId: null,
      path: provider.providerId === 'yandex_disk' ? 'disk:/' : '/',
    });
  };

  const handleOpenItem = async (item: CloudItem) => {
    if (!activeProviderId) {
      return;
    }

    if (item.kind === 'directory') {
      openFolder({
        providerId: activeProviderId,
        folderId: item.id,
        path: item.path,
      });
      return;
    }

    try {
      const provider = appContainer.cloudProviderRegistry.get(activeProviderId);
      const localPath = await provider.downloadFile({
        fileId: activeProviderId === 'dropbox' || activeProviderId === 'yandex_disk'
          ? item.path
          : item.id,
        fileName: item.name,
        destinationDirectoryPath: getCloudProviderDownloadDirectory(
          provider.displayName,
        ),
      });
      Alert.alert('İndirme tamamlandı', `${item.name} indirildi.`, [
        {text: 'Tamam'},
        {
          text: 'Aç',
          onPress: () => {
            void localFileSystemBridge.openFile(localPath).catch(() => undefined);
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        'İndirme tamamlanamadı',
        error instanceof Error ? error.message : 'Dosya indirilemedi.',
      );
    }
  };

  const handleUpload = async () => {
    if (!activeProviderId) {
      return;
    }

    try {
      const pickedFile = await localFileSystemBridge.pickLocalFile();
      const provider = appContainer.cloudProviderRegistry.get(activeProviderId);
      await provider.uploadFile({
        localPath: pickedFile.path,
        fileName: pickedFile.name,
        ...(activeFolderId ? {parentId: activeFolderId} : {}),
        parentPath: activePath,
      });
      await loadFolder();
      Alert.alert('Yükleme tamamlandı', `${pickedFile.name} buluta yüklendi.`);
    } catch (error) {
      Alert.alert(
        'Yükleme tamamlanamadı',
        error instanceof Error ? error.message : 'Dosya yüklenemedi.',
      );
    }
  };

  const renderProviderCard = (provider: CloudProviderSummary) => {
    const color = providerColors[provider.providerId];
    const isPhaseTwo = isPhaseTwoProvider(provider.providerId);
    const quotaText =
      provider.account?.usedBytes != null && provider.account.totalBytes != null
        ? `${formatBytes(provider.account.usedBytes)} / ${formatBytes(
            provider.account.totalBytes,
          )}`
        : null;

    return (
      <View
        key={provider.providerId}
        style={{
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
          <Cloud color={color} size={22} />
          <View style={{flex: 1}}>
            <AppText weight="semibold">{provider.displayName}</AppText>
            <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
              {getStatusLabel(provider)}
            </AppText>
          </View>
        </View>

        {provider.connected && provider.account ? (
          <View style={{gap: theme.spacing.xs}}>
            <AppText style={{fontSize: theme.typography.caption}}>
              {provider.account.displayName}
            </AppText>
            {quotaText ? (
              <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
                {quotaText}
              </AppText>
            ) : null}
          </View>
        ) : null}

        <View style={{flexDirection: 'row', gap: theme.spacing.sm}}>
          {provider.connected ? (
            <>
              <Pressable
                onPress={() => handleOpenProvider(provider)}
                style={{
                  flex: 1,
                  backgroundColor: theme.colors.primary,
                  paddingVertical: theme.spacing.sm,
                  alignItems: 'center',
                }}>
                <AppText style={{color: '#FFFFFF'}} weight="semibold">
                  Dosyaları Gör
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  void handleDisconnect(provider.providerId);
                }}
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}>
                <Link2Off color={theme.colors.text} size={18} />
              </Pressable>
            </>
          ) : isPhaseTwo ? (
            <View
              style={{
                flex: 1,
                backgroundColor: theme.colors.surfaceMuted,
                paddingVertical: theme.spacing.sm,
                alignItems: 'center',
              }}>
              <AppText style={{color: theme.colors.textMuted}} weight="semibold">
                Ikinci Faz
              </AppText>
            </View>
          ) : (
            <Pressable
              disabled={!provider.isConfigured}
              onPress={() => {
                void handleConnect(provider.providerId);
              }}
              style={{
                flex: 1,
                backgroundColor: provider.isConfigured
                  ? theme.colors.primary
                  : theme.colors.surfaceMuted,
                paddingVertical: theme.spacing.sm,
                alignItems: 'center',
              }}>
              <AppText
                style={{color: provider.isConfigured ? '#FFFFFF' : theme.colors.textMuted}}
                weight="semibold">
                {provider.isConfigured ? 'Bağlan' : 'Yapılandırma Eksik'}
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  const renderItem = (item: CloudItem) => {
    const isDirectory = item.kind === 'directory';

    return (
      <Pressable
        key={`${item.providerId}-${item.id}`}
        onPress={() => {
          void handleOpenItem(item);
        }}
        style={({pressed}) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          paddingVertical: theme.spacing.md,
          opacity: pressed ? 0.75 : 1,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        })}>
        {item.thumbnailUrl && !isDirectory ? (
          <Image
            source={{uri: item.thumbnailUrl}}
            style={{height: 38, width: 38, backgroundColor: theme.colors.surfaceMuted}}
          />
        ) : (
          <View
            style={{
              height: 38,
              width: 38,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.surfaceMuted,
            }}>
            {isDirectory ? (
              <Folder color={theme.colors.primary} size={20} />
            ) : (
              <Download color={theme.colors.textMuted} size={18} />
            )}
          </View>
        )}
        <View style={{flex: 1}}>
          <AppText numberOfLines={1}>{item.name}</AppText>
          <AppText tone="muted" style={{fontSize: theme.typography.caption}}>
            {isDirectory
              ? 'Klasör'
              : `${formatBytes(item.sizeBytes ?? 0)}  ${formatAbsoluteDate(
                  item.modifiedAt,
                )}`}
          </AppText>
        </View>
      </Pressable>
    );
  };

  if (activeProviderId && activeProvider) {
    return (
      <View style={{paddingBottom: theme.spacing.xxl}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing.md,
          }}>
          <Pressable
            onPress={resetBrowser}
            style={{padding: theme.spacing.sm}}>
            <ArrowLeft color={theme.colors.text} size={20} />
          </Pressable>
          <View style={{flex: 1}}>
            <AppText weight="semibold">{activeProvider.displayName}</AppText>
            <AppText tone="muted" numberOfLines={1} style={{fontSize: theme.typography.caption}}>
              {activePath}
            </AppText>
          </View>
          <Pressable
            onPress={() => {
              void loadFolder();
            }}
            style={{padding: theme.spacing.sm}}>
            <RefreshCcw color={theme.colors.text} size={18} />
          </Pressable>
          <Pressable
            onPress={() => {
              void handleUpload();
            }}
            style={{padding: theme.spacing.sm}}>
            <HardDriveUpload color={theme.colors.primary} size={20} />
          </Pressable>
        </View>

        {errorMessage ? (
          <EmptyState
            description={errorMessage}
            icon="cloud"
            title="Bulut klasörü okunamadı"
          />
        ) : null}

        <ScrollView
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                void loadFolder();
              }}
              refreshing={isLoading}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}>
          {isLoading && activeItems.length === 0 ? (
            <View style={{paddingVertical: theme.spacing.xxl}}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : activeItems.length > 0 ? (
            activeItems.map(renderItem)
          ) : (
            <EmptyState
              description="Bu bulut klasöründe görüntülenecek öğe bulunmuyor."
              icon="cloud"
              title="Klasör boş"
            />
          )}
          {nextCursor ? (
            <Pressable
              onPress={() => {
                void loadFolder({cursor: nextCursor, append: true});
              }}
              style={{
                marginTop: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: theme.spacing.md,
                alignItems: 'center',
              }}>
              <AppText>Devamını yükle</AppText>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{paddingBottom: theme.spacing.xxl}}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: theme.spacing.md,
        }}>
        <View style={{flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm}}>
          <Cloud color={theme.colors.primary} size={24} />
          <AppText style={{fontSize: theme.typography.title}} weight="semibold">
            Bulut
          </AppText>
        </View>
        <Pressable onPress={onBack} style={{padding: theme.spacing.sm}}>
          <ArrowLeft color={theme.colors.text} size={20} />
        </Pressable>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              void refreshProviders();
            }}
            refreshing={false}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={{gap: theme.spacing.md}}>
          {providers.map(renderProviderCard)}
        </View>
      </ScrollView>
    </View>
  );
};

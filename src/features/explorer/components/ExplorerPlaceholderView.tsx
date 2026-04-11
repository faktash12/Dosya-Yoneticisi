import React, {useState} from 'react';
import {Pressable, Switch, View} from 'react-native';
import {
  ArrowLeft,
  Cloud,
  FileImage,
  MonitorSmartphone,
  Network,
  Package,
  ServerCog,
  Trash2,
} from 'lucide-react-native';

import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import type {CloudProviderSummary} from '@/domain/entities/CloudProvider';
import {CloudHubView} from '@/features/cloud/components/CloudHubView';
import type {ExplorerPlaceholderView as ExplorerPlaceholderModel} from '@/features/explorer/types/explorer.types';
import {useAppTheme} from '@/hooks/useAppTheme';
import {
  localFileSystemBridge,
  type FtpServerStatus,
} from '@/services/platform/LocalFileSystemBridge';

interface ExplorerPlaceholderViewProps {
  placeholder: ExplorerPlaceholderModel;
  providers?: CloudProviderSummary[];
  onProvidersChanged?: (providers: CloudProviderSummary[]) => void;
  onBack: () => void;
}

const placeholderMeta = {
  'system-info': {
    icon: MonitorSmartphone,
    sectionTitle: 'Korunan sistem alanı',
  },
  'cloud-hub': {
    icon: Cloud,
    sectionTitle: 'Bulut sağlayıcıları',
  },
  'social-groups': {
    icon: ServerCog,
    sectionTitle: 'Sosyal klasörler',
  },
  'network-access': {
    icon: Network,
    sectionTitle: 'Erişim',
  },
  'recycle-bin': {
    icon: Trash2,
    sectionTitle: 'Geri dönüşüm durumu',
  },
  'apps-info': {
    icon: Package,
    sectionTitle: 'Uygulama paketleri',
  },
  'unsupported-category': {
    icon: ServerCog,
    sectionTitle: 'Güvenli yönlendirme',
  },
  'file-preview': {
    icon: FileImage,
    sectionTitle: 'Dosya önizleme durumu',
  },
} as const;

export const ExplorerPlaceholderView = ({
  placeholder,
  providers = [],
  onProvidersChanged,
  onBack,
}: ExplorerPlaceholderViewProps): React.JSX.Element => {
  const theme = useAppTheme();
  const meta = placeholderMeta[placeholder.kind];
  const Icon = meta.icon;
  const isCloud = placeholder.kind === 'cloud-hub';
  const isNetwork = placeholder.kind === 'network-access';
  const [ftpShowHidden, setFtpShowHidden] = useState(false);
  const [ftpStatus, setFtpStatus] = useState<FtpServerStatus | null>(null);
  const [ftpError, setFtpError] = useState<string | null>(null);
  const [isFtpBusy, setFtpBusy] = useState(false);

  if (isCloud) {
    return (
      <CloudHubView
        onBack={onBack}
        onProvidersChanged={onProvidersChanged ?? (() => undefined)}
        providers={providers}
      />
    );
  }

  const handleStartFtp = async () => {
    try {
      setFtpBusy(true);
      setFtpError(null);
      setFtpStatus(await localFileSystemBridge.startFtpServer(ftpShowHidden));
    } catch (error) {
      setFtpError(
        error instanceof Error ? error.message : 'PC erişimi başlatılamadı.',
      );
    } finally {
      setFtpBusy(false);
    }
  };

  const handleStopFtp = async () => {
    try {
      setFtpBusy(true);
      setFtpError(null);
      setFtpStatus(await localFileSystemBridge.stopFtpServer());
    } catch (error) {
      setFtpError(
        error instanceof Error ? error.message : 'PC erişimi kapatılamadı.',
      );
    } finally {
      setFtpBusy(false);
    }
  };

  return (
    <View style={{paddingBottom: theme.spacing.xxl}}>
      <SectionCard style={{marginBottom: theme.spacing.lg}}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: theme.spacing.md,
          }}>
          <View style={{flex: 1}}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}>
              <Icon color={theme.colors.primary} size={22} />
              <AppText
                style={{fontSize: theme.typography.title, lineHeight: 32}}
                weight="bold">
                {placeholder.title}
              </AppText>
            </View>
            <AppText tone="muted" style={{marginTop: theme.spacing.sm, lineHeight: 22}}>
              {placeholder.description}
            </AppText>
          </View>
          <Pressable
            onPress={onBack}
            style={{
              borderRadius: theme.radii.lg,
              backgroundColor: theme.colors.surfaceMuted,
              padding: theme.spacing.md,
            }}>
            <ArrowLeft color={theme.colors.text} size={18} />
          </Pressable>
        </View>
      </SectionCard>

      {!isNetwork ? (
      <SectionCard style={{marginBottom: theme.spacing.lg}}>
        <AppText weight="semibold">{meta.sectionTitle}</AppText>
        <View style={{marginTop: theme.spacing.md, gap: theme.spacing.sm}}>
          {(placeholder.supportingLines ?? [
            'Bu ekran bilinçli olarak boş bırakılmaz.',
            'Kullanıcı ana akıştan kopmadan geri dönebilir.',
          ]).map(line => (
            <View
              key={line}
              style={{
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.surfaceMuted,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.md,
              }}>
              <AppText tone="muted" style={{lineHeight: 20}}>
                {line}
              </AppText>
            </View>
          ))}
        </View>
      </SectionCard>
      ) : null}

      {isNetwork ? (
        <SectionCard>
          <AppText weight="semibold">FTP erişimi</AppText>
          <View
            style={{
              marginTop: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <AppText>Gizli dosyaları göster</AppText>
            <Switch
              onValueChange={setFtpShowHidden}
              thumbColor="#FFFFFF"
              trackColor={{false: theme.colors.border, true: theme.colors.primary}}
              value={ftpShowHidden}
            />
          </View>

          {ftpStatus?.isRunning ? (
            <View style={{marginTop: theme.spacing.md, gap: theme.spacing.sm}}>
              <AppText>Adres: {ftpStatus.address}</AppText>
              <AppText>Kullanıcı adı: {ftpStatus.username}</AppText>
              <AppText>Şifre: {ftpStatus.password}</AppText>
            </View>
          ) : null}

          {ftpError ? (
            <AppText
              style={{marginTop: theme.spacing.md, color: theme.colors.danger}}>
              {ftpError}
            </AppText>
          ) : null}

          <Pressable
            disabled={isFtpBusy}
            onPress={() => {
              void (ftpStatus?.isRunning ? handleStopFtp() : handleStartFtp());
            }}
            style={{
              marginTop: theme.spacing.lg,
              backgroundColor: ftpStatus?.isRunning
                ? theme.colors.danger
                : theme.colors.primary,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
              alignItems: 'center',
            }}>
            <AppText style={{color: '#FFFFFF'}} weight="semibold">
              {isFtpBusy
                ? 'İşleniyor'
                : ftpStatus?.isRunning
                  ? 'Bağlantıyı Kes'
                  : 'Başlat'}
            </AppText>
          </Pressable>
        </SectionCard>
      ) : null}
    </View>
  );
};

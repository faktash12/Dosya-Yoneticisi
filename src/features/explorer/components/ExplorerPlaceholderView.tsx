import React from 'react';
import {Pressable, View} from 'react-native';
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
import {EmptyState} from '@/components/feedback/EmptyState';
import type {CloudProviderSummary} from '@/domain/entities/CloudProvider';
import type {ExplorerPlaceholderView as ExplorerPlaceholderModel} from '@/features/explorer/types/explorer.types';
import {useAppTheme} from '@/hooks/useAppTheme';

interface ExplorerPlaceholderViewProps {
  placeholder: ExplorerPlaceholderModel;
  providers?: CloudProviderSummary[];
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
  'remote-access': {
    icon: ServerCog,
    sectionTitle: 'Uzak erişim hazırlığı',
  },
  'network-access': {
    icon: Network,
    sectionTitle: 'Ağ erişim katmanı',
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
    sectionTitle: 'Güvenli fallback',
  },
  'file-preview': {
    icon: FileImage,
    sectionTitle: 'Dosya önizleme durumu',
  },
} as const;

export const ExplorerPlaceholderView = ({
  placeholder,
  providers = [],
  onBack,
}: ExplorerPlaceholderViewProps): React.JSX.Element => {
  const theme = useAppTheme();
  const meta = placeholderMeta[placeholder.kind];
  const Icon = meta.icon;
  const isCloud = placeholder.kind === 'cloud-hub';

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
                alignSelf: 'flex-start',
                borderRadius: theme.radii.lg,
                backgroundColor: theme.colors.primaryMuted,
                padding: theme.spacing.md,
                marginBottom: theme.spacing.md,
              }}>
              <Icon color={theme.colors.primary} size={22} />
            </View>
            <AppText
              style={{fontSize: theme.typography.title, lineHeight: 32}}
              weight="bold">
              {placeholder.title}
            </AppText>
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

      {isCloud ? (
        providers.length > 0 ? (
          <SectionCard>
            <AppText weight="semibold">Hazır sağlayıcılar</AppText>
            <View style={{marginTop: theme.spacing.md, gap: theme.spacing.sm}}>
              {providers.map(provider => (
                <View
                  key={provider.providerId}
                  style={{
                    borderRadius: theme.radii.lg,
                    backgroundColor: theme.colors.surfaceMuted,
                    padding: theme.spacing.md,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                    }}>
                    <Cloud color={theme.colors.primary} size={16} />
                    <AppText weight="semibold">{provider.displayName}</AppText>
                  </View>
                  <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
                    {provider.connected
                      ? 'Bağlı hesap hazır.'
                      : 'Mock sağlayıcı hazır, bağlantı bu sürümde bilgi ekranı seviyesinde tutuluyor.'}
                  </AppText>
                </View>
              ))}
            </View>
          </SectionCard>
        ) : (
          <EmptyState
            description="Bulut hub hazır, ancak henüz bağlı bir sağlayıcı bulunmuyor."
            icon="cloud"
            supportingText="Sağlayıcı listesi boş olsa bile ekran stabil ve açıklayıcı kalır."
            title="Henüz bağlı sağlayıcı yok"
          />
        )
      ) : null}
    </View>
  );
};

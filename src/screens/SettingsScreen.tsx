import React, {useEffect} from 'react';
import {Pressable, ScrollView, Switch, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Monitor, Moon, Sun} from 'lucide-react-native';

import {appContainer} from '@/app/di/container';
import type {RootStackParamList} from '@/app/navigation/types';
import type {ColorSchemePreference} from '@/app/theme';
import {useUiStore} from '@/app/store/ui.store';
import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useCloudStore} from '@/features/cloud/store/cloud.store';
import {useAppTheme} from '@/hooks/useAppTheme';

const themeOptions: Array<{
  value: ColorSchemePreference;
  label: string;
  icon: typeof Monitor;
}> = [
  {value: 'system', label: 'Sistem', icon: Monitor},
  {value: 'light', label: 'Açık', icon: Sun},
  {value: 'dark', label: 'Koyu', icon: Moon},
];

export const SettingsScreen = (): React.JSX.Element => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const providers = useCloudStore(state => state.providers);
  const hydrate = useCloudStore(state => state.hydrate);
  const preference = useUiStore(state => state.colorSchemePreference);
  const showHiddenFiles = useUiStore(state => state.showHiddenFiles);
  const setPreference = useUiStore(state => state.setColorSchemePreference);
  const setShowHiddenFiles = useUiStore(state => state.setShowHiddenFiles);

  useEffect(() => {
    const loadProviders = async () => {
      const summaries = await appContainer.getAvailableProvidersUseCase.execute();
      hydrate(summaries);
    };

    void loadProviders();
  }, [hydrate]);

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText style={{fontSize: theme.typography.title}} weight="bold">
            Ayarlar
          </AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            Tema, görünüm tercihleri ve depolama davranışı burada yönetilir.
          </AppText>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText weight="semibold">Tema</AppText>
          <View
            style={{
              marginTop: theme.spacing.md,
              flexDirection: 'row',
              gap: theme.spacing.sm,
            }}>
            {themeOptions.map(option => {
              const Icon = option.icon;

              return (
              <Pressable
                key={option.value}
                onPress={() => setPreference(option.value)}
                style={{
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor:
                    preference === option.value
                      ? theme.colors.primary
                      : theme.colors.border,
                  backgroundColor:
                    preference === option.value
                      ? theme.colors.primaryMuted
                      : theme.colors.surface,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                  }}>
                  <Icon
                    color={
                      preference === option.value
                        ? theme.colors.primary
                        : theme.colors.text
                    }
                    size={16}
                  />
                  <AppText weight="semibold">{option.label}</AppText>
                </View>
              </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText weight="semibold">Dosya görünümü</AppText>
          <View
            style={{
              marginTop: theme.spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing.md,
            }}>
            <View style={{flex: 1}}>
              <AppText weight="semibold">Gizli dosyaları göster</AppText>
              <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
                Açık olduğunda “.” ile başlayan dosya ve klasörler listelenir.
              </AppText>
            </View>
            <Switch
              onValueChange={setShowHiddenFiles}
              thumbColor="#FFFFFF"
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              value={showHiddenFiles}
            />
          </View>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText weight="semibold">Bulut sağlayıcıları</AppText>
          <View style={{marginTop: theme.spacing.md, gap: theme.spacing.sm}}>
            {providers.map(provider => (
              <View
                key={provider.providerId}
                style={{
                  borderRadius: theme.radii.md,
                  backgroundColor: theme.colors.surfaceMuted,
                  padding: theme.spacing.md,
                }}>
                <AppText weight="semibold">{provider.displayName}</AppText>
                <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
                  {provider.connected
                    ? 'Bağlı hesap hazır'
                    : 'Henüz bağlantı yapılmadı. Sağlayıcı entegrasyonu daha sonra tamamlanabilir.'}
                </AppText>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <AppText weight="semibold">Depolama Analizi</AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            Kategori bazlı kullanım ve büyük klasör taraması için giriş noktası.
          </AppText>
          <Pressable
            onPress={() => navigation.navigate('StorageAnalysis')}
            style={{
              marginTop: theme.spacing.md,
              alignSelf: 'flex-start',
              borderRadius: theme.radii.md,
              backgroundColor: theme.colors.primary,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: theme.spacing.md,
            }}>
            <AppText style={{color: '#FFFFFF'}} weight="semibold">
              Analizi aç
            </AppText>
          </Pressable>
        </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
};

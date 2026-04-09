import React, {useEffect} from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';

import {appContainer} from '@/app/di/container';
import type {RootStackParamList} from '@/app/navigation/types';
import {useUiStore} from '@/app/store/ui.store';
import {AppText} from '@/components/common/AppText';
import {SectionCard} from '@/components/common/SectionCard';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useCloudStore} from '@/features/cloud/store/cloud.store';
import {useAppTheme} from '@/hooks/useAppTheme';

export const SettingsScreen = (): React.JSX.Element => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useAppTheme();
  const providers = useCloudStore(state => state.providers);
  const hydrate = useCloudStore(state => state.hydrate);
  const preference = useUiStore(state => state.colorSchemePreference);
  const setPreference = useUiStore(state => state.setColorSchemePreference);

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
            Tema, provider baglantilari ve cihaz depolama analizi burada yonetilir.
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
            {(['system', 'light', 'dark'] as const).map(item => (
              <Pressable
                key={item}
                onPress={() => setPreference(item)}
                style={{
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor:
                    preference === item
                      ? theme.colors.primary
                      : theme.colors.border,
                  backgroundColor:
                    preference === item
                      ? theme.colors.primaryMuted
                      : theme.colors.surface,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: theme.spacing.sm,
                }}>
                <AppText weight="semibold">{item}</AppText>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText weight="semibold">Cloud Provider Hazirligi</AppText>
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
                    ? 'Bagli hesap hazir'
                    : 'Baglanti yok, OAuth adapteri sonraki fazda eklenebilir'}
                </AppText>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard>
          <AppText weight="semibold">Depolama Analizi</AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            Kategori bazli kullanim ve buyuk klasor taramasi icin giris noktasi.
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
              Analizi ac
            </AppText>
          </Pressable>
        </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
};


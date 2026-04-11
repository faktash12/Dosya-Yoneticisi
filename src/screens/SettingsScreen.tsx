import React, {useEffect, useMemo, useState} from 'react';
import {Pressable, ScrollView, View} from 'react-native';
import {Monitor, Moon, Sun} from 'lucide-react-native';

import {appContainer} from '@/app/di/container';
import type {ColorSchemePreference} from '@/app/theme';
import {useUiStore} from '@/app/store/ui.store';
import {AppText} from '@/components/common/AppText';
import {BottomSheetModal} from '@/components/common/BottomSheetModal';
import {SectionCard} from '@/components/common/SectionCard';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useCloudStore} from '@/features/cloud/store/cloud.store';
import {useAppTheme} from '@/hooks/useAppTheme';
import {languageOptions, useTranslation} from '@/i18n';

const themeOptions: Array<{
  value: ColorSchemePreference;
  labelKey: 'settings.theme.system' | 'settings.theme.light' | 'settings.theme.dark';
  icon: typeof Monitor;
}> = [
  {value: 'system', labelKey: 'settings.theme.system', icon: Monitor},
  {value: 'light', labelKey: 'settings.theme.light', icon: Sun},
  {value: 'dark', labelKey: 'settings.theme.dark', icon: Moon},
];

export const SettingsScreen = (): React.JSX.Element => {
  const theme = useAppTheme();
  const providers = useCloudStore(state => state.providers);
  const hydrate = useCloudStore(state => state.hydrate);
  const preference = useUiStore(state => state.colorSchemePreference);
  const locale = useUiStore(state => state.locale);
  const setPreference = useUiStore(state => state.setColorSchemePreference);
  const setLocale = useUiStore(state => state.setLocale);
  const {t} = useTranslation();
  const [sheet, setSheet] = useState<'about' | 'version' | null>(null);

  const versionItems = useMemo(
    () => [
      {version: 'V1.1', notes: t('settings.versionCurrentNotes')},
      {version: 'V1.0', notes: t('settings.versionLegacyNotes')},
    ],
    [t],
  );

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
            {t('settings.title')}
          </AppText>
          <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
            {t('settings.description')}
          </AppText>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText weight="semibold">{t('settings.theme')}</AppText>
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
                  <AppText weight="semibold">{t(option.labelKey)}</AppText>
                </View>
              </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText weight="semibold">{t('settings.language')}</AppText>
          <View style={{marginTop: theme.spacing.md, gap: theme.spacing.sm}}>
            {languageOptions.map(option => {
              const isActive = locale === option.locale;

              return (
                <Pressable
                  key={option.locale}
                  onPress={() => setLocale(option.locale)}
                  style={{
                    borderRadius: theme.radii.md,
                    borderWidth: 1,
                    borderColor: isActive ? theme.colors.primary : theme.colors.border,
                    backgroundColor: isActive
                      ? theme.colors.primaryMuted
                      : theme.colors.surfaceMuted,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.sm,
                  }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <AppText weight="semibold">
                      {option.flag} {option.label}
                    </AppText>
                    <AppText tone={isActive ? 'default' : 'muted'}>
                      {isActive ? t('settings.language.selected') : t('settings.language.select')}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <AppText weight="semibold">{t('settings.cloudProviders')}</AppText>
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
                    ? t('settings.providerConnected')
                    : t('settings.providerPending')}
                </AppText>
              </View>
            ))}
          </View>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.lg}}>
          <Pressable
            onPress={() => setSheet('version')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <AppText weight="semibold">{t('settings.version')}</AppText>
            <AppText tone="muted">V1.1</AppText>
          </Pressable>
        </SectionCard>

        <SectionCard style={{marginBottom: theme.spacing.xxl}}>
          <Pressable
            onPress={() => setSheet('about')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <AppText weight="semibold">{t('settings.about')}</AppText>
            <AppText tone="muted">Akblog Net</AppText>
          </Pressable>
        </SectionCard>
      </ScrollView>

      <BottomSheetModal
        onClose={() => setSheet(null)}
        title={t('settings.sheetVersionTitle')}
        visible={sheet === 'version'}>
        <View style={{gap: theme.spacing.md}}>
          {versionItems.map(item => (
            <View
              key={item.version}
              style={{
                borderWidth: 1,
                borderColor: theme.colors.border,
                padding: theme.spacing.md,
              }}>
              <AppText weight="bold">{item.version}</AppText>
              <AppText tone="muted" style={{marginTop: theme.spacing.xs}}>
                {item.notes}
              </AppText>
            </View>
          ))}
          <Pressable
            onPress={() => setSheet(null)}
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.primary,
              paddingVertical: theme.spacing.md,
            }}>
            <AppText style={{color: '#FFFFFF'}} weight="semibold">
              {t('settings.sheetClose')}
            </AppText>
          </Pressable>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        onClose={() => setSheet(null)}
        title={t('settings.sheetAboutTitle')}
        visible={sheet === 'about'}>
        <View style={{gap: theme.spacing.md}}>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.colors.border,
              padding: theme.spacing.md,
            }}>
            <AppText weight="bold">{t('settings.aboutDeveloper')}</AppText>
            <AppText tone="muted" style={{marginTop: theme.spacing.sm}}>
              {t('settings.aboutBody')}
            </AppText>
            <AppText tone="muted" style={{marginTop: theme.spacing.sm}}>
              {t('settings.aboutLicense')}
            </AppText>
          </View>
          <Pressable
            onPress={() => setSheet(null)}
            style={{
              alignItems: 'center',
              backgroundColor: theme.colors.primary,
              paddingVertical: theme.spacing.md,
            }}>
            <AppText style={{color: '#FFFFFF'}} weight="semibold">
              {t('settings.sheetClose')}
            </AppText>
          </Pressable>
        </View>
      </BottomSheetModal>
    </ScreenContainer>
  );
};

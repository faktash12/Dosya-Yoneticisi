import React from 'react';
import {Pressable, View} from 'react-native';
import type {FallbackProps} from 'react-error-boundary';

import {AppText} from '@/components/common/AppText';
import {ScreenContainer} from '@/components/layout/ScreenContainer';
import {useAppTheme} from '@/hooks/useAppTheme';

export const AppErrorFallback = ({
  resetErrorBoundary,
}: FallbackProps): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <ScreenContainer style={{justifyContent: 'center'}}>
      <View
        style={{
          borderRadius: theme.radii.lg,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.xl,
        }}>
        <AppText style={{fontSize: theme.typography.heading}} weight="bold">
          Uygulama beklenmeyen bir hatayla karsilasti
        </AppText>
        <AppText tone="muted" style={{marginTop: theme.spacing.sm}}>
          Bu katman sonraki asamada Crashlytics veya Sentry ile baglanabilir.
        </AppText>
        <Pressable
          onPress={resetErrorBoundary}
          style={{
            marginTop: theme.spacing.lg,
            alignSelf: 'flex-start',
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.primary,
            paddingHorizontal: theme.spacing.lg,
            paddingVertical: theme.spacing.md,
          }}>
          <AppText style={{color: '#FFFFFF'}} weight="semibold">
            Tekrar dene
          </AppText>
        </Pressable>
      </View>
    </ScreenContainer>
  );
};


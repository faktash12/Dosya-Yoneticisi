import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {ErrorBoundary} from 'react-error-boundary';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {AppThemeProvider, useThemeContext} from '@/app/providers/AppThemeProvider';
import {AppErrorFallback} from '@/components/feedback/AppErrorFallback';

const NavigationProvider = ({
  children,
}: React.PropsWithChildren): React.JSX.Element => {
  const theme = useThemeContext();

  return (
    <NavigationContainer theme={theme.navigationTheme}>
      {children}
    </NavigationContainer>
  );
};

export const AppProviders = ({
  children,
}: React.PropsWithChildren): React.JSX.Element => {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AppThemeProvider>
          <ErrorBoundary FallbackComponent={AppErrorFallback}>
            <NavigationProvider>{children}</NavigationProvider>
          </ErrorBoundary>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};


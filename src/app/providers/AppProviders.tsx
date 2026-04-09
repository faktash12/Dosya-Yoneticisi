import React, {useRef} from 'react';
import {
  NavigationContainer,
  type NavigationContainerRef,
} from '@react-navigation/native';
import {ErrorBoundary} from 'react-error-boundary';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import type {RootStackParamList} from '@/app/navigation/types';
import {AppThemeProvider, useThemeContext} from '@/app/providers/AppThemeProvider';
import {AppErrorFallback} from '@/components/feedback/AppErrorFallback';
import {appDiagnostics} from '@/services/logging/AppDiagnostics';
import {appLogger} from '@/services/logging/AppLogger';

const NavigationProvider = ({
  children,
}: React.PropsWithChildren): React.JSX.Element => {
  const theme = useThemeContext();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const previousRouteNameRef = useRef<string | undefined>(undefined);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={theme.navigationTheme}
      onReady={() => {
        const routeName = navigationRef.current?.getCurrentRoute()?.name;
        previousRouteNameRef.current = routeName;
        void appDiagnostics.recordBreadcrumb('Navigation', 'Ready', {
          routeName,
        });
      }}
      onStateChange={() => {
        const routeName = navigationRef.current?.getCurrentRoute()?.name;

        if (routeName && routeName !== previousRouteNameRef.current) {
          previousRouteNameRef.current = routeName;
          void appDiagnostics.recordBreadcrumb('Navigation', 'Route changed', {
            routeName,
          });
        }
      }}>
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
          <ErrorBoundary
            FallbackComponent={AppErrorFallback}
            onError={(error, info) => {
              const normalizedError =
                error instanceof Error
                  ? error
                  : new Error('Unknown render error');

              appLogger.error({
                scope: 'AppProviders',
                message: 'Unhandled render error',
                data: {
                  message: normalizedError.message,
                  stack: normalizedError.stack,
                  componentStack: info.componentStack,
                },
              });

              void appDiagnostics.recordError('AppProviders', normalizedError, {
                componentStack: info.componentStack,
              });
            }}>
            <NavigationProvider>{children}</NavigationProvider>
          </ErrorBoundary>
        </AppThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

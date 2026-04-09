import React from 'react';
import {StatusBar} from 'react-native';

import {RootNavigator} from '@/app/navigation/RootNavigator';
import {AppProviders} from '@/app/providers/AppProviders';
import {useThemeContext} from '@/app/providers/AppThemeProvider';
import {appDiagnostics} from '@/services/logging/AppDiagnostics';

const AppShell = (): React.JSX.Element => {
  const theme = useThemeContext();

  React.useEffect(() => {
    void appDiagnostics.recordBreadcrumb('AppShell', 'App shell mounted', {
      themeMode: theme.mode,
    });
  }, [theme.mode]);

  return (
    <>
      <StatusBar
        barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      <RootNavigator />
    </>
  );
};

const App = (): React.JSX.Element => {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
};

export default App;

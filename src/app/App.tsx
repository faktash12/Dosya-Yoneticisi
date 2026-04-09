import React from 'react';
import {StatusBar} from 'react-native';

import {RootNavigator} from '@/app/navigation/RootNavigator';
import {AppProviders} from '@/app/providers/AppProviders';
import {useThemeContext} from '@/app/providers/AppThemeProvider';

const AppShell = (): React.JSX.Element => {
  const theme = useThemeContext();

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

import React, {createContext, useContext} from 'react';
import {useColorScheme} from 'react-native';

import {createAppTheme, type AppTheme} from '@/app/theme';
import {useUiStore} from '@/app/store/ui.store';

const ThemeContext = createContext<AppTheme>(createAppTheme('light'));

export const AppThemeProvider = ({
  children,
}: React.PropsWithChildren): React.JSX.Element => {
  const systemScheme = useColorScheme();
  const preference = useUiStore(state => state.colorSchemePreference);
  const normalizedSystemScheme =
    systemScheme === 'dark' ? 'dark' : 'light';

  const resolvedMode =
    preference === 'system' ? normalizedSystemScheme : preference;

  return (
    <ThemeContext.Provider value={createAppTheme(resolvedMode)}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): AppTheme => useContext(ThemeContext);

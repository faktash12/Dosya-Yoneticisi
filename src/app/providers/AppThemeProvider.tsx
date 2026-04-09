import React, {createContext, useContext, useMemo} from 'react';
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
  const theme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = (): AppTheme => useContext(ThemeContext);

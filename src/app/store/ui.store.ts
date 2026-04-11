import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

import type {ColorSchemePreference} from '@/app/theme';

export type AppLocale = 'tr' | 'en';

interface UiState {
  colorSchemePreference: ColorSchemePreference;
  locale: AppLocale;
  showHiddenFiles: boolean;
  setColorSchemePreference: (preference: ColorSchemePreference) => void;
  setLocale: (locale: AppLocale) => void;
  setShowHiddenFiles: (showHiddenFiles: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    set => ({
      colorSchemePreference: 'light',
      locale: 'tr',
      showHiddenFiles: false,
      setColorSchemePreference: colorSchemePreference =>
        set({colorSchemePreference}),
      setLocale: locale => set({locale}),
      setShowHiddenFiles: showHiddenFiles => set({showHiddenFiles}),
    }),
    {
      name: 'ui-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        colorSchemePreference: state.colorSchemePreference,
        locale: state.locale,
        showHiddenFiles: state.showHiddenFiles,
      }),
    },
  ),
);

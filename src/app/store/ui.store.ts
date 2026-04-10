import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';

import type {ColorSchemePreference} from '@/app/theme';

interface UiState {
  colorSchemePreference: ColorSchemePreference;
  showHiddenFiles: boolean;
  setColorSchemePreference: (preference: ColorSchemePreference) => void;
  setShowHiddenFiles: (showHiddenFiles: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    set => ({
      colorSchemePreference: 'light',
      showHiddenFiles: false,
      setColorSchemePreference: colorSchemePreference =>
        set({colorSchemePreference}),
      setShowHiddenFiles: showHiddenFiles => set({showHiddenFiles}),
    }),
    {
      name: 'ui-preferences',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        colorSchemePreference: state.colorSchemePreference,
        showHiddenFiles: state.showHiddenFiles,
      }),
    },
  ),
);

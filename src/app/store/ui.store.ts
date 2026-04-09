import {create} from 'zustand';

import type {ColorSchemePreference} from '@/app/theme';

interface UiState {
  colorSchemePreference: ColorSchemePreference;
  setColorSchemePreference: (preference: ColorSchemePreference) => void;
}

export const useUiStore = create<UiState>(set => ({
  colorSchemePreference: 'system',
  setColorSchemePreference: colorSchemePreference => set({colorSchemePreference}),
}));


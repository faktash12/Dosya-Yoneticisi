import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import type {RootStackParamList} from '@/app/navigation/types';
import {useAppTheme} from '@/hooks/useAppTheme';
import {ExplorerScreen} from '@/screens/ExplorerScreen';
import {SettingsScreen} from '@/screens/SettingsScreen';
import {StorageAnalysisScreen} from '@/screens/StorageAnalysisScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator = (): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.text,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}>
      <Stack.Screen
        component={ExplorerScreen}
        name="Explorer"
        options={{headerShown: false}}
      />
      <Stack.Screen
        component={SettingsScreen}
        name="Settings"
        options={{title: 'Ayarlar'}}
      />
      <Stack.Screen
        component={StorageAnalysisScreen}
        name="StorageAnalysis"
        options={{title: 'Depolama Analizi'}}
      />
    </Stack.Navigator>
  );
};

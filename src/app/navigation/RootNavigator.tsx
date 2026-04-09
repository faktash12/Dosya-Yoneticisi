import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {MainTabs} from '@/app/navigation/MainTabs';
import type {RootStackParamList} from '@/app/navigation/types';
import {useAppTheme} from '@/hooks/useAppTheme';
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
        component={MainTabs}
        name="MainTabs"
        options={{headerShown: false}}
      />
      <Stack.Screen
        component={StorageAnalysisScreen}
        name="StorageAnalysis"
        options={{title: 'Depolama Analizi'}}
      />
    </Stack.Navigator>
  );
};


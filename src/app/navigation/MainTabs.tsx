import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  Heart,
  RefreshCcwDot,
  Settings2,
  SquareStack,
} from 'lucide-react-native';

import type {MainTabParamList} from '@/app/navigation/types';
import {useAppTheme} from '@/hooks/useAppTheme';
import {ExplorerScreen} from '@/screens/ExplorerScreen';
import {FavoritesScreen} from '@/screens/FavoritesScreen';
import {SettingsScreen} from '@/screens/SettingsScreen';
import {TransfersScreen} from '@/screens/TransfersScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const TAB_ICONS = {
  Explorer: SquareStack,
  Favorites: Heart,
  Transfers: RefreshCcwDot,
  Settings: Settings2,
} as const;

export const MainTabs = (): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      initialRouteName="Explorer"
      screenOptions={({route}) => ({
        lazy: true,
        freezeOnBlur: true,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.tabInactive,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({color, size}) => {
          const Icon = TAB_ICONS[route.name];
          return <Icon color={color} size={size} />;
        },
      })}>
      <Tab.Screen name="Explorer" component={ExplorerScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Transfers" component={TransfersScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

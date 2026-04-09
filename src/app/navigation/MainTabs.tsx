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

export const MainTabs = (): React.JSX.Element => {
  const theme = useAppTheme();

  return (
    <Tab.Navigator
      initialRouteName="Explorer"
      screenOptions={({route}) => ({
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
        tabBarIcon: ({color, size}) => {
          if (route.name === 'Explorer') {
            return <SquareStack color={color} size={size} />;
          }

          if (route.name === 'Favorites') {
            return <Heart color={color} size={size} />;
          }

          if (route.name === 'Transfers') {
            return <RefreshCcwDot color={color} size={size} />;
          }

          return <Settings2 color={color} size={size} />;
        },
      })}>
      <Tab.Screen name="Explorer" component={ExplorerScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Transfers" component={TransfersScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

